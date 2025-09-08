require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/database.js");

const PORT = process.env.PORT || 3000;

// Kết nối database
connectDB();

// Khởi động server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
});
