<div align="center">

# 📋 Project Management System
### Hệ thống quản lý dự án Agile/Scrum toàn diện

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

</div>

---

## 🎯 Mục đích dự án

Project Management System là giải pháp Full-stack hỗ trợ các team vận hành theo mô hình Agile/Scrum hiệu quả:

*   **⚡ Quản lý Agile/Scrum:** Hỗ trợ Backlog, Sprint Planning, Sprint Tracking.
*   **✅ Quản lý Task:** Tạo, phân công, theo dõi tiến độ nhiệm vụ trực quan.
*   **🤝 Collaboration:** Tương tác Real-time (Socket.io), bình luận, thông báo tức thì.
*   **📊 Báo cáo & Analytics:** Gantt chart, metrics hiệu suất, audit logs.
*   **🛡️ Quản lý tài nguyên:** Phân quyền theo vai trò (Role-based), quản lý User/Team.

---

## 🏗️ Kiến trúc hệ thống

### 1. High-Level Architecture
Mô hình Client-Server giao tiếp qua RESTful API và WebSocket.

```text
┌─────────────────────┐      HTTP/WebSocket      ┌─────────────────────┐
│                     │ ────────────────────────► │                     │
│   Frontend (React)  │                           │  Backend (Express)  │
│   Port: 3000        │ ◄──────────────────────── │   Port: 8080        │
│                     │                           │                     │
└─────────────────────┘                           └─────────────────────┘
                                                           │
                                                           │ Mongoose ODM
                                                           ▼
                                                  ┌─────────────────────┐
                                                  │                     │
                                                  │   MongoDB Database  │
                                                  │                     │
                                                  └─────────────────────┘
### 2. Luồng dữ liệu (Data Flow)
┌─────────────────┐
│   User Action   │
│   (Frontend)    │
└─────────┬───────┘
          │ HTTP Request
          ▼
┌─────────────────┐
│   API Routes    │
│   (Express)     │
└─────────┬───────┘
          │ Route to Controller
          ▼
┌─────────────────┐
│   Controllers   │
│   (Validation)  │
└─────────┬───────┘
          │ Business Logic
          ▼
┌─────────────────┐
│   Services      │
│   (Core Logic)  │
└─────────┬───────┘
          │ Data Operations
          ▼
┌─────────────────┐
│   Models        │
│   (Mongoose)    │
└─────────┬───────┘
          │ Database Queries
          ▼
┌─────────────────┐
│   MongoDB       │
│   (Persistence) │
└─────────────────┘
🔧 Công nghệ sử dụng
🎨 Frontend (Client)
Công nghệ	Phiên bản	Mục đích
React	19.1.1	UI Library
React Router	7.8.2	Client-side routing
Bootstrap	5.3.7	CSS Framework
Axios	1.12.2	HTTP Client
Socket.io Client	4.8.1	Giao tiếp thời gian thực
React DnD	16.0.1	Kéo thả (Drag & Drop)
TipTap	3.6.2	Rich Text Editor
⚙️ Backend (Server)
Công nghệ	Phiên bản	Mục đích
Express.js	5.1.0	Web Framework
Mongoose	8.18.0	MongoDB ODM
Socket.io	4.8.1	Real-time Engine
JWT	9.0.2	Authentication
Cloudinary	1.41.3	Lưu trữ file/ảnh
Nodemailer	7.0.6	Gửi email
🚀 Cài đặt và chạy dự án
Yêu cầu hệ thống
Node.js >= 16.0.0
MongoDB >= 4.4
NPM >= 8.0.0
Bước 1: Clone dự án
code
Bash
git clone <repository-url>
cd project_tlcn
Bước 2: Cấu hình môi trường
Tạo file .env tại thư mục gốc project-management-system (Backend):
code
Env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/project_management
JWT_SECRET=your-secure-jwt-secret
# Cloudinary Config
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# Email Config
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
Bước 3: Cài đặt Dependencies
Mở terminal tại thư mục gốc của dự án (project_tlcn):
code
Bash
# Cài đặt cho Backend
cd project-management-system
npm install

# Quay lại thư mục gốc và cài đặt cho Frontend
cd .. 
cd project-management-system-fe
npm install
Bước 4: Chạy dự án
Bạn cần mở 2 cửa sổ Terminal riêng biệt:
Terminal 1 (Backend):
code
Bash
cd project-management-system
npm start
# Server sẽ chạy tại http://localhost:8080
Terminal 2 (Frontend):
code
Bash
cd project-management-system-fe
npm start
# Client sẽ chạy tại http://localhost:3000
