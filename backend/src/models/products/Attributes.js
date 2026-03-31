const mongoose = require('mongoose');

const SizeSchema = new mongoose.Schema({ size_name: { type: String, required: true, unique: true } });
const ColorSchema = new mongoose.Schema({ color_name: { type: String, required: true }, hex_code: String });
const TypeSchema = new mongoose.Schema({ type_name: { type: String, required: true } });

module.exports = {
    Size: mongoose.model('P_Size', SizeSchema),
    Color: mongoose.model('P_Color', ColorSchema),
    Type: mongoose.model('P_Type', TypeSchema)
};