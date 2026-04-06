const Carrier = require('../../models/orders/Carrier');

exports.getAll = async (req, res) => {
    try {
        const carriers = await Carrier.find({ is_active: true }).sort({ name: 1 });
        res.json({ success: true, data: carriers });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const carrier = await Carrier.create(req.body);
        res.status(201).json({ success: true, data: carrier });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ success: false, message: 'Tên hoặc mã đã tồn tại' });
        res.status(400).json({ success: false, error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updated = await Carrier.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        res.json({ success: true, data: updated });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        await Carrier.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Đã xóa' });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};

exports.toggle = async (req, res) => {
    try {
        const carrier = await Carrier.findById(req.params.id);
        if (!carrier) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
        carrier.is_active = !carrier.is_active;
        await carrier.save();
        res.json({ success: true, data: carrier });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
};
