// src/config/db.ts (Kiểm tra và đảm bảo chạy được)

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_URL as string) || 'mongodb://127.0.0.1:27017/ScoreTableTennis'; // Đảm bảo DB_URL có giá trị
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB connection failed", err);
        process.exit(1);
    }
};