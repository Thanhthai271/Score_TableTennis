// src/routes/score.route.ts (ĐÃ KIỂM TRA)

import express from 'express';
import { 
    getRankings, 
    updateMatchResult, 
    createPlayer, 
    deletePlayer,
    getPlayerById, 
    updatePlayerDetails 
} from '../controller/score.controller'; // <--- ĐẢM BẢO ĐƯỜNG DẪN NÀY LÀ CHÍNH XÁC

const scoreRouter = express.Router();

scoreRouter.get('/', getRankings);
scoreRouter.post('/update', updateMatchResult);
scoreRouter.post('/create', createPlayer);
scoreRouter.delete('/delete', deletePlayer);

scoreRouter.get('/id/:id', getPlayerById);
scoreRouter.patch('/id/:id', updatePlayerDetails);

export default scoreRouter;