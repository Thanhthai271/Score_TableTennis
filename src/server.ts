// src/server.ts 

import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors"; // 👈 1. IMPORT CỦA THƯ VIỆN CORS
import {connectDB} from "./config/db";
import * as routesModule from "./routes/index";

const router = routesModule.default;

// 1. Tải các biến môi trường
dotenv.config();

// 2. Khởi tạo ứng dụng Express
const app = express();

// Cấu hình CORS
const corsOptions = {
    // Cho phép tất cả các domain (origin) truy cập.
    // Dùng '*' trong môi trường phát triển (Development) là an toàn.
    // Nếu bạn muốn giới hạn, thay '*' bằng 'http://127.0.0.1:5500'
    origin: '*', 
    // Cho phép các phương thức HTTP cần thiết cho CRUD
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 
    // Cho phép các headers cần thiết
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions)); // 👈 2. SỬ DỤNG MIDDLEWARE CORS

// 3. Cấu hình Middleware Cốt lõi
app.use(express.json()); 

// Middleware Log Request
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log("Request:", req.method, req.originalUrl);
    next();
});

// 4. Đăng ký Routes
// Tất cả API sẽ bắt đầu bằng /api và được xử lý bởi index.ts trong routes
app.use("/api", router);

// 5. Kết nối Database
connectDB();

// 6. Khởi chạy Server
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`[SUCCESS] Server running on port ${PORT}`);
    console.log(`[API] Truy cập xếp hạng: http://localhost:${PORT}/api/scores`);
});