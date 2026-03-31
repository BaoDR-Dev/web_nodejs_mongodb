const nodemailer = require('nodemailer');

// ─── Tạo transporter một lần, tái sử dụng ────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false, // true nếu port 465
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const FROM = `"${process.env.MAIL_FROM_NAME || 'Fashion Store'}" <${process.env.MAIL_USER}>`;

// ─── 1. ĐĂNG KÝ TÀI KHOẢN ────────────────────────────────────────────────────
exports.sendWelcomeEmail = async ({ to, full_name, username }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: '🎉 Chào mừng bạn đến với Fashion Store!',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#1a1a2e;margin-top:0">Xin chào ${full_name}! 👋</h2>
            <p style="color:#555;line-height:1.7">
              Tài khoản của bạn đã được tạo thành công.<br>
              Tên đăng nhập: <strong>${username}</strong>
            </p>
            <p style="color:#555;line-height:1.7">
              Hãy bắt đầu khám phá hàng ngàn sản phẩm thời trang tại cửa hàng của chúng tôi!
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${process.env.FRONTEND_URL}" 
                 style="background:#1a1a2e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
                Mua sắm ngay
              </a>
            </div>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
            Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
          </div>
        </div>`
    });
};

// ─── 2. ĐẶT LẠI MẬT KHẨU ─────────────────────────────────────────────────────
exports.sendResetPasswordEmail = async ({ to, full_name, reset_token }) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${reset_token}`;
    const expireMin = process.env.RESET_TOKEN_EXPIRE_MINUTES || 30;

    await transporter.sendMail({
        from: FROM,
        to,
        subject: '🔑 Yêu cầu đặt lại mật khẩu',
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#1a1a2e;margin-top:0">Đặt lại mật khẩu</h2>
            <p style="color:#555;line-height:1.7">Xin chào <strong>${full_name}</strong>,</p>
            <p style="color:#555;line-height:1.7">
              Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
              Nhấn vào nút bên dưới để tạo mật khẩu mới. Link có hiệu lực trong <strong>${expireMin} phút</strong>.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${resetUrl}" 
                 style="background:#e74c3c;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color:#999;font-size:13px">
              Hoặc copy link này vào trình duyệt:<br>
              <a href="${resetUrl}" style="color:#e74c3c;word-break:break-all">${resetUrl}</a>
            </p>
            <p style="color:#999;font-size:13px">
              Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
            </p>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
            © Fashion Store — Email tự động, vui lòng không trả lời.
          </div>
        </div>`
    });
};

// ─── 3. XÁC NHẬN ĐẶT HÀNG ───────────────────────────────────────────────────
exports.sendOrderConfirmEmail = async ({ to, full_name, order }) => {
    // Tạo HTML cho từng sản phẩm
    const itemsHtml = order.details.map(item => {
        const variant = item.variant_id;
        const name = variant?.product_id?.name || 'Sản phẩm';
        const sku  = variant?.sku || '';
        const price = (item.unit_price || 0).toLocaleString('vi-VN');
        const qty   = item.quantity;
        const sub   = (item.unit_price * item.quantity).toLocaleString('vi-VN');
        return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee">
            <strong>${name}</strong><br>
            <span style="color:#888;font-size:12px">${sku}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${qty}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${price}₫</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${sub}₫</td>
        </tr>`;
    }).join('');

    const total    = (order.total_price || 0).toLocaleString('vi-VN');
    const discount = (order.discount_amount || 0).toLocaleString('vi-VN');
    const payMethod = order.payments?.[0]?.method || 'Chưa xác định';
    const orderUrl = `${process.env.FRONTEND_URL}/orders/${order._id}`;

    await transporter.sendMail({
        from: FROM,
        to,
        subject: `✅ Đặt hàng thành công #${order._id}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#27ae60;margin-top:0">✅ Đặt hàng thành công!</h2>
            <p style="color:#555">Xin chào <strong>${full_name}</strong>, cảm ơn bạn đã mua hàng!</p>
            <p style="color:#888;font-size:13px">Mã đơn hàng: <strong style="color:#1a1a2e">#${order._id}</strong></p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead>
                <tr style="background:#f5f5f5">
                  <th style="padding:10px 8px;text-align:left;font-size:13px">Sản phẩm</th>
                  <th style="padding:10px 8px;text-align:center;font-size:13px">SL</th>
                  <th style="padding:10px 8px;text-align:right;font-size:13px">Đơn giá</th>
                  <th style="padding:10px 8px;text-align:right;font-size:13px">Thành tiền</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <table style="width:100%;margin-top:8px">
              ${order.discount_amount > 0 ? `
              <tr>
                <td style="padding:4px 0;color:#555">Giảm giá (voucher)</td>
                <td style="padding:4px 0;text-align:right;color:#e74c3c">-${discount}₫</td>
              </tr>` : ''}
              <tr>
                <td style="padding:8px 0;font-weight:bold;font-size:16px">Tổng thanh toán</td>
                <td style="padding:8px 0;text-align:right;font-weight:bold;font-size:16px;color:#1a1a2e">${total}₫</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#555;font-size:13px">Phương thức</td>
                <td style="padding:4px 0;text-align:right;color:#555;font-size:13px">${payMethod}</td>
              </tr>
            </table>

            <div style="text-align:center;margin:24px 0">
              <a href="${orderUrl}" 
                 style="background:#1a1a2e;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
                Xem đơn hàng
              </a>
            </div>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
            © Fashion Store — Cảm ơn bạn đã tin tưởng mua sắm tại đây!
          </div>
        </div>`
    });
};

// ─── 4. THANH TOÁN MOMO THÀNH CÔNG ───────────────────────────────────────────
exports.sendPaymentSuccessEmail = async ({ to, full_name, order_id, amount, transaction_id }) => {
    const amountFmt = Number(amount).toLocaleString('vi-VN');
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `💚 Thanh toán MoMo thành công #${order_id}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#a50064;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">MoMo × Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#27ae60;margin-top:0">💚 Thanh toán thành công!</h2>
            <p style="color:#555">Xin chào <strong>${full_name}</strong>,</p>
            <p style="color:#555;line-height:1.7">
              Thanh toán MoMo của bạn đã được xác nhận.<br>
              Đơn hàng đang được xử lý và sẽ sớm được giao đến bạn.
            </p>
            <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:4px 0;color:#555"><strong>Mã đơn hàng:</strong> #${order_id}</p>
              <p style="margin:4px 0;color:#555"><strong>Số tiền:</strong> ${amountFmt}₫</p>
              <p style="margin:4px 0;color:#555"><strong>Mã giao dịch MoMo:</strong> ${transaction_id}</p>
            </div>
          </div>
          <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
            © Fashion Store
          </div>
        </div>`
    });
};


// ─── 5. GỬI OTP ĐĂNG KÝ ──────────────────────────────────────────────────────
exports.sendRegisterOtp = async ({ to, full_name, otp }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `[Fashion Store] Mã xác minh đăng ký: ${otp}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#1a1a2e;margin-top:0;font-size:18px">Xác minh tài khoản</h2>
            <p style="color:#555;line-height:1.7">Xin chào <strong>${full_name}</strong>,</p>
            <p style="color:#555;line-height:1.7">Mã OTP xác minh đăng ký của bạn là:</p>
            <div style="text-align:center;margin:24px 0">
              <div style="display:inline-block;background:#f0f4ff;border:2px dashed #1a1a2e;border-radius:10px;padding:16px 40px">
                <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#1a1a2e">${otp}</span>
              </div>
            </div>
            <p style="color:#999;font-size:13px;text-align:center">Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
          </div>
          <div style="background:#f5f5f5;padding:14px;text-align:center;font-size:12px;color:#999">
            Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
          </div>
        </div>`
    });
};

// ─── 6. GỬI OTP RESET MẬT KHẨU ───────────────────────────────────────────────
exports.sendResetOtp = async ({ to, full_name, otp }) => {
    await transporter.sendMail({
        from: FROM,
        to,
        subject: `[Fashion Store] Mã OTP đặt lại mật khẩu: ${otp}`,
        html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #eee;border-radius:8px;overflow:hidden">
          <div style="background:#1a1a2e;padding:20px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">Fashion Store</h1>
          </div>
          <div style="padding:28px 32px">
            <h2 style="color:#1a1a2e;margin-top:0;font-size:18px">Đặt lại mật khẩu</h2>
            <p style="color:#555;line-height:1.7">Xin chào <strong>${full_name}</strong>,</p>
            <p style="color:#555;line-height:1.7">Mã OTP để đặt lại mật khẩu của bạn là:</p>
            <div style="text-align:center;margin:24px 0">
              <div style="display:inline-block;background:#fff5f5;border:2px dashed #e74c3c;border-radius:10px;padding:16px 40px">
                <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#e74c3c">${otp}</span>
              </div>
            </div>
            <p style="color:#999;font-size:13px;text-align:center">Mã có hiệu lực trong <strong>5 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
            <p style="color:#999;font-size:13px;text-align:center">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
          </div>
          <div style="background:#f5f5f5;padding:14px;text-align:center;font-size:12px;color:#999">
            © Fashion Store — Email tự động, vui lòng không trả lời.
          </div>
        </div>`
    });
};
