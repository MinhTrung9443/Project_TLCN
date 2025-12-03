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

```mermaid
graph LR
    Client[🖥️ Frontend React] <-->|HTTP / WebSocket| Server[⚙️ Backend Express]
    Server -->|Mongoose ODM| DB[(🗄️ MongoDB)]
    
    style Client fill:#61DAFB,stroke:#333,stroke-width:2px,color:black
    style Server fill:#8CC84B,stroke:#333,stroke-width:2px,color:black
    style DB fill:#4EA94B,stroke:#333,stroke-width:2px,color:white
```

### 2. Luồng dữ liệu (Data Flow)

```mermaid
graph TD
    User((👤 User Action)) -->|HTTP Request| API[📡 API Routes]
    API -->|Route| Controller[🎮 Controllers]
    Controller -->|Business Logic| Service[⚙️ Services]
    Service -->|Data Operations| Model[🗃️ Models]
    Model -->|Query| DB[(MongoDB)]
    
    subgraph Backend Logic
    API
    Controller
    Service
    Model
    end
```

---

## 🔧 Công nghệ sử dụng

### 🎨 Frontend (Client)
| Công nghệ | Phiên bản | Mục đích |
| :--- | :---: | :--- |
| **React** | `19.1.1` | UI Library |
| **React Router** | `7.8.2` | Client-side routing |
| **Bootstrap** | `5.3.7` | CSS Framework |
| **Axios** | `1.12.2` | HTTP Client |
| **Socket.io Client** | `4.8.1` | Giao tiếp thời gian thực |
| **React DnD** | `16.0.1` | Kéo thả (Drag & Drop) |
| **TipTap** | `3.6.2` | Rich Text Editor |
| **Moment.js** | `2.30.1` | Xử lý ngày tháng |

### ⚙️ Backend (Server)
| Công nghệ | Phiên bản | Mục đích |
| :--- | :---: | :--- |
| **Express.js** | `5.1.0` | Web Framework |
| **Mongoose** | `8.18.0` | MongoDB ODM |
| **Socket.io** | `4.8.1` | Real-time Engine |
| **JWT** | `9.0.2` | Authentication |
| **BCrypt** | `6.0.0` | Mã hóa mật khẩu |
| **Cloudinary** | `1.41.3` | Lưu trữ file/ảnh |
| **Nodemailer** | `7.0.6` | Gửi email |
| **Multer** | `2.0.2` | Upload file |

---

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống
*   Node.js >= 16.0.0
*   MongoDB >= 4.4
*   NPM >= 8.0.0

### Bước 1: Clone dự án
```bash
git clone <repository-url>
cd project_tlcn
```

### Bước 2: Cấu hình môi trường
Tạo file `.env` tại thư mục gốc backend (`project-management-system/`):

```env
PORT=8080
JWT_SECRET=suppersecretkeysuppersecretkeysuppersecretkeysuppersecretkeysuppersecretkey
JWT_EXPIRES_IN=1h
FRONTEND_URL=http://localhost:3000

NODE_ENV=development
MONGODB_URI=mongodb+srv://admin:admin123@minhtrung.mno0nlr.mongodb.net/project_management
BCRYPT_SALT_ROUNDS=12

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=minhtrungbttv@gmail.com
EMAIL_PASSWORD=oavo nhgl nrud nwls

CLOUDINARY_CLOUD_NAME=drgeypfqc
CLOUDINARY_API_KEY=674294725223813
CLOUDINARY_API_SECRET=qPbZ88t5XxRMsfiMypCtD0C9fH0
```

### Bước 3: Cài đặt Dependencies
Bạn cần cài đặt thư viện cho cả Backend và Frontend.

```bash
# 1. Cài đặt cho Backend
cd project-management-system
npm install

# 2. Quay lại thư mục gốc và vào Frontend
cd .. 
cd project-management-system-fe
npm install
```

### Bước 4: Chạy dự án
Bạn cần mở **2 cửa sổ Terminal** riêng biệt để chạy song song:

**Terminal 1 (Backend):**
```bash
cd project-management-system
npm start
# Server sẽ chạy tại http://localhost:8080
```

**Terminal 2 (Frontend):**
```bash
cd project-management-system-fe
npm start
# Client sẽ chạy tại http://localhost:3000
```
