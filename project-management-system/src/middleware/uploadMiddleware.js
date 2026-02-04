const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const path = require("path");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    console.log("📤 [CloudinaryStorage] params called");
    console.log(
      "📤 [CloudinaryStorage] file:",
      file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
          }
        : "NO FILE",
    );

    if (!file || !file.mimetype) {
      console.error("❌ [CloudinaryStorage] No file or mimetype!");
      throw new AppError("No file provided!", 400);
    }

    let folder, resource_type;

    if (file.mimetype.startsWith("image")) {
      folder = "specialty-foods/images";
      resource_type = "image";
    } else if (file.mimetype.startsWith("video")) {
      folder = "specialty-foods/videos";
      resource_type = "video";
    } else {
      folder = "specialty-foods/raw_files";
      resource_type = "raw";
    }

    const originalName = path.parse(file.originalname).name;
    const public_id = `${Date.now()}-${originalName}`;

    console.log("📤 [CloudinaryStorage] Upload config:", { folder, resource_type, public_id });

    return {
      folder: folder,
      resource_type: resource_type,
      public_id: public_id,
    };
  },
});

const fileFilter = (req, file, cb) => {
  // Thêm lại các định dạng video
  const allowedFileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|mp4|mov|avi|wmv|mkv/;
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  }
  cb(new AppError("Định dạng file không được hỗ trợ!", 400));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB limit for Cloudinary free plan
  },
  fileFilter,
});

// Simple memory storage for chat history files (keeps buffer for server-side processing)
const memoryStorage = multer.memoryStorage();

const chatHistoryFileFilter = (req, file, cb) => {
  // Accept text files, txt files, or files with text/* mimetype
  const isTextFile = file.mimetype === "text/plain" || file.mimetype.startsWith("text/") || file.originalname.endsWith(".txt");

  if (isTextFile) {
    cb(null, true);
  } else {
    cb(null, true); // Allow any file for now, backend will validate
  }
};

const chatHistoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10MB limit for chat history
  },
  fileFilter: chatHistoryFileFilter,
});

module.exports = upload;
module.exports.chatHistoryUpload = chatHistoryUpload;
