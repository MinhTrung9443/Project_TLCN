const multer = require('multer');
const path = require('path'); // <<< SỬA LẠI THÀNH require('path')
const fs = require('fs');     // <<< SỬA LẠI THÀNH require('fs')

// Đảm bảo thư mục 'uploads' tồn tại
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ cho multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Thư mục lưu file
    },
    filename: function (req, file, cb) {
        // Giữ lại tên gốc nhưng thêm timestamp để tránh trùng lặp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_')); // Thay thế khoảng trắng bằng gạch dưới
    }
});

// Không lọc file, cho phép mọi loại file
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 100 } // Tăng giới hạn lên 100MB
});

module.exports = upload;