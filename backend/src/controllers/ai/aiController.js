const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../../models/products/Product');
const ProductVariant = require('../../models/products/ProductVariant');
const ProductImage = require('../../models/products/ProductImage');

// ─── Cache session lịch sử chat theo sessionId (in-memory) ───────────────────
// Key: sessionId, Value: { history: [], lastActive: Date }
const sessionStore = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 phút

// Dọn session hết hạn mỗi 10 phút
setInterval(() => {
    const now = Date.now();
    for (const [id, sess] of sessionStore.entries()) {
        if (now - sess.lastActive > SESSION_TTL_MS) sessionStore.delete(id);
    }
}, 10 * 60 * 1000);

// ─── Khởi tạo Gemini ──────────────────────────────────────────────────────────
const getModel = () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
};

// ─── Lấy context sản phẩm từ DB ───────────────────────────────────────────────
const buildProductContext = async () => {
    const products = await Product.find({ }).lean();
    if (!products.length) return 'Hiện tại chưa có sản phẩm nào trong cửa hàng.';

    // Lấy variant và ảnh theo batch
    const productIds = products.map(p => p._id);
    const [variants, images] = await Promise.all([
        ProductVariant.find({ product_id: { $in: productIds } }).lean(),
        ProductImage.find({ is_primary: true }).lean()
    ]);

    const variantMap = {};
    variants.forEach(v => {
        if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
        variantMap[v.product_id].push(v);
    });

    const imageMap = {};
    images.forEach(img => { imageMap[img.variant_id?.toString()] = img.image_url; });

    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
    const BACKEND  = `http://localhost:${process.env.PORT || 5000}`;

    return products.map(p => {
        const pvs = variantMap[p._id.toString()] || [];
        const minPrice = pvs.length ? Math.min(...pvs.map(v => v.price)) : 0;
        const maxPrice = pvs.length ? Math.max(...pvs.map(v => v.price)) : 0;
        const priceStr = minPrice === maxPrice
            ? `${minPrice.toLocaleString('vi-VN')}₫`
            : `${minPrice.toLocaleString('vi-VN')}₫ – ${maxPrice.toLocaleString('vi-VN')}₫`;

        const firstVariant = pvs[0];
        const imgUrl = firstVariant
            ? `${BACKEND}/uploads/${imageMap[firstVariant._id.toString()] || ''}`
            : '';
        const productUrl = `${FRONTEND}/products/${p._id}`;

        const variantDetails = pvs.map(v =>
            `  • SKU: ${v.sku} | Giá: ${v.price.toLocaleString('vi-VN')}₫ | Tồn: ${v.stock_quantity}`
        ).join('\n');

        return `[Sản phẩm]
Tên: ${p.name}
Mô tả: ${p.description || 'Chưa có mô tả'}
Giá: ${priceStr}
Link: ${productUrl}
Ảnh: ${imgUrl}
Biến thể:\n${variantDetails || '  Chưa có biến thể'}`;
    }).join('\n\n---\n\n');
};

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
    try {
        const { message, session_id } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi' });
        }

        // Lấy hoặc tạo session
        const sid = session_id || `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        if (!sessionStore.has(sid)) {
            sessionStore.set(sid, { history: [], lastActive: Date.now() });
        }
        const session = sessionStore.get(sid);
        session.lastActive = Date.now();

        // Build context sản phẩm
        const productContext = await buildProductContext();

        // System prompt — chỉ đưa vào lần đầu của session
        const systemPrompt = `Bạn là trợ lý bán hàng thân thiện của Fashion Store.
Nhiệm vụ: Tư vấn sản phẩm, giải đáp thắc mắc về đơn hàng, vận chuyển, đổi trả.
Ngôn ngữ: Tiếng Việt, thân thiện, ngắn gọn.
Khi giới thiệu sản phẩm: hiển thị HTML đẹp có ảnh, tên, giá và link.
Khi câu hỏi không liên quan đến cửa hàng: trả lời tự nhiên nhưng nhắc khéo về sản phẩm.

DANH SÁCH SẢN PHẨM HIỆN CÓ:
${productContext}`;

        // Xây dựng history cho Gemini multi-turn
        const model = getModel();
        const chatHistory = session.history.length === 0
            ? [{ role: 'user', parts: [{ text: systemPrompt }] },
               { role: 'model', parts: [{ text: 'Xin chào! Tôi là trợ lý Fashion Store, rất vui được hỗ trợ bạn. Bạn muốn tìm kiếm sản phẩm gì?' }] }]
            : session.history;

        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(message);
        const answer = result.response.text()
            .replace(/```(html|plaintext)?\n?/g, '')
            .trim();

        // Cập nhật history
        session.history = [
            ...chatHistory,
            { role: 'user',  parts: [{ text: message }] },
            { role: 'model', parts: [{ text: answer }] }
        ];
        // Giới hạn history 20 lượt (40 messages) để tránh token overflow
        if (session.history.length > 42) {
            session.history = [
                session.history[0], session.history[1], // giữ system prompt
                ...session.history.slice(-40)
            ];
        }

        res.json({
            success: true,
            session_id: sid,
            answer,
            history_count: Math.floor((session.history.length - 2) / 2)
        });
    } catch (err) {
        console.error('[AI] chat error:', err.message);
        const isApiErr = err.message?.includes('API_KEY') || err.message?.includes('quota');
        res.status(500).json({
            success: false,
            answer: isApiErr
                ? "<p style='color:red'>Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.</p>"
                : "<p style='color:red'>Xin lỗi, tôi không thể xử lý yêu cầu lúc này.</p>",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// ─── DELETE /api/ai/chat/:session_id ─────────────────────────────────────────
exports.clearSession = (req, res) => {
    const { session_id } = req.params;
    sessionStore.delete(session_id);
    res.json({ success: true, message: 'Đã xóa lịch sử hội thoại' });
};
