// File: routes/uploadRoutes.js
const express = require('express');
const router = express.Router();

// Lưu ý: Vì project của bạn dùng require, bạn cần chỉnh file middleware sang cú pháp CommonJS
// Hoặc cấu hình project để dùng ES Modules. Giả sử bạn đã chỉnh file upload.
// Sửa lại thành thế này
const upload = require('../middleware/uploadMiddleware');
// Route này sẽ là: POST /api/uploads/
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file' });
        }

        res.status(200).json({
            message: 'Upload thành công!',
            imageUrl: req.file.path, // URL từ Cloudinary
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;