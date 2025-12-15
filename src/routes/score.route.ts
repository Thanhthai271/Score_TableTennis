// src/routes/score.route.ts

import express from 'express';
import { getRankings, updateMatchResult, createPlayer, deletePlayer } from '../controller/score.controller'; 

const scoreRouter = express.Router();

// Lấy bảng xếp hạng
scoreRouter.get('/', getRankings);

// Gửi kết quả trận đấu để cập nhật điểm
scoreRouter.post('/update', updateMatchResult);

scoreRouter.post('/create', createPlayer)

scoreRouter.delete('/delete', deletePlayer)

export default scoreRouter;