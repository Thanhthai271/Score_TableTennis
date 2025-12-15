// src/routes/index.ts

import express from 'express';
import scoreRouter from './score.route';

const router = express.Router();
router.use('/scores', scoreRouter); 


export default router;