// src/routes/index.ts (CẦN PHẢI CÓ)

import express from 'express';
import scoreRouter from './score.route'; 

const router = express.Router();

// Đăng ký tất cả các route xếp hạng dưới tiền tố /scores
router.use('/scores', scoreRouter); 

export default router;

// Lưu ý: File server.ts của bạn đã đúng khi gọi: app.use("/api", router);
// Điều này tạo ra đường dẫn hoàn chỉnh: /api/scores/...