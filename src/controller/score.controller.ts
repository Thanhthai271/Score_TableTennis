// src/controllers/score.controller.ts (Hoàn chỉnh và Đầy đủ Logic)

import { Request, Response } from 'express';
import Player, { IPlayer } from '../models/score.model'; 
import { Document } from 'mongoose'; // Cần thiết cho type casting

// --- LOGIC TÍNH ĐIỂM VÀ PHÂN HẠNG ---

const SCORE_MAP: { [key: string]: number } = {
    '3-0': 15,
    '3-1': 10,
    '3-2': 5
};

const RANK_CONFIG = {
    BASE_POINT: 40,
    POINT_STEP: 60,
    RANKS: ['E', 'D2', 'D1', 'C2', 'C1', 'B2', 'B1', 'A2', 'A1', 'A0']
};

interface CalculatedPoints {
    pointsP1: number;
    pointsP2: number;
    error?: string;
}

const calculateRankingPoints = (set1: number, set2: number): CalculatedPoints => {
    let pointsP1 = 0;
    let pointsP2 = 0;
    
    const isWin = (set1 === 3 && set2 < 3 && set2 >= 0) || (set2 === 3 && set1 < 3 && set1 >= 0);

    if (set1 < 0 || set2 < 0 || set1 > 3 || set2 > 3 || !isWin) {
        return { 
            pointsP1: 0, 
            pointsP2: 0, 
            error: "Tỉ số không hợp lệ. Kết quả phải là 3-0, 3-1, 3-2, 0-3, 1-3, hoặc 2-3." 
        };
    }

    let key: string;
    let points: number;

    if (set1 > set2) { // P1 thắng
        key = `${set1}-${set2}`; 
        points = SCORE_MAP[key];
        pointsP1 = points;
        pointsP2 = -points;
    } else if (set2 > set1) { // P2 thắng
        key = `${set2}-${set1}`; 
        points = SCORE_MAP[key];
        pointsP2 = points;
        pointsP1 = -points;
    } else {
        return { pointsP1: 0, pointsP2: 0, error: "Lỗi nội bộ: Tỷ số hòa không được phép." };
    }

    return { pointsP1, pointsP2 };
};

const determinePlayerRank = (totalPoints: number): string => {
    const { BASE_POINT, POINT_STEP, RANKS } = RANK_CONFIG;
    const MAX_POINTS_FOR_A0 = 580; 

    if (totalPoints >= MAX_POINTS_FOR_A0) {
        return RANKS[RANKS.length - 1]; // 'A0'
    }

    if (totalPoints < BASE_POINT) return RANKS[0]; // 'E'

    let rankIndex = Math.floor((totalPoints - BASE_POINT) / POINT_STEP);
    const maxRankIndex = RANKS.length - 2; 

    if (rankIndex >= maxRankIndex) {
        return RANKS[maxRankIndex]; // 'A1'
    }

    return RANKS[rankIndex];
};


// --- API Controller Methods ---

const createPlayer = async (req: Request, res: Response): Promise<void> => {
    const { name, total_points, phone_number } = req.body; 
    // ... (logic kiểm tra và tạo người chơi)
    if (!name || name.trim() === '') {
        res.status(400).json({ message: 'Tên người chơi không được để trống.' });
        return;
    }
    if (total_points === undefined || typeof total_points !== 'number' || total_points < 0) {
        res.status(400).json({ message: 'Tổng điểm phải là số không âm hợp lệ.' });
        return;
    }
    const calculatedRank = determinePlayerRank(total_points);
    try {
        const existingPlayer = await Player.findOne({ name: name.trim() });
        if (existingPlayer) {
            res.status(409).json({ message: `Người chơi "${name}" đã tồn tại.` });
            return;
        }
        const newPlayer = new Player({
            name: name.trim(),
            total_points: total_points,
            rank: calculatedRank,
            phone_number: phone_number || ''
        });
        await newPlayer.save();
        res.status(201).json({
            message: `Người chơi "${name}" đã được tạo thành công với Hạng ${calculatedRank}!`,
            player: {
                name: newPlayer.name,
                total_points: newPlayer.total_points,
                rank: newPlayer.rank,
                phone_number: newPlayer.phone_number
            }
        });
    } catch (error) {
        console.error("Lỗi Server khi tạo người chơi:", error);
        res.status(500).json({ message: 'Lỗi Server khi tạo người chơi.', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

const getRankings = async (req: Request, res: Response): Promise<void> => {
    try {
        const rankings = await Player.find().sort({ total_points: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu xếp hạng.', error });
    }
};

const updateMatchResult = async (req: Request, res: Response): Promise<void> => {
    const { p1_name, p2_name, set1, set2 } = req.body;
    
    // ... (logic kiểm tra đầu vào)

    try {
        // --- THÊM .trim() ĐỂ XỬ LÝ KHOẢNG TRẮNG CÓ TRONG TÊN VĐV ---
        const p1 = await Player.findOne({ name: p1_name.trim() }) as (IPlayer & Document) | null; 
        const p2 = await Player.findOne({ name: p2_name.trim() }) as (IPlayer & Document) | null; 
        // -----------------------------------------------------------------

        if (!p1 || !p2) {
            res.status(404).json({ message: 'Không tìm thấy một hoặc cả hai người chơi. Vui lòng kiểm tra chính tả tên.' });
            return;
        }
        const { pointsP1, pointsP2, error } = calculateRankingPoints(set1, set2);
        if (error) {
            res.status(400).json({ message: error });
            return;
        }
        p1.total_points += pointsP1;
        p2.total_points += pointsP2;
        p1.rank = determinePlayerRank(p1.total_points); 
        p2.rank = determinePlayerRank(p2.total_points);
        await p1.save();
        await p2.save();
        res.status(200).json({
            message: 'Cập nhật kết quả thành công!',
            p1_update: { points: pointsP1, new_rank: p1.rank },
            p2_update: { points: pointsP2, new_rank: p2.rank }
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi Server khi xử lý trận đấu.', error });
    }
};

const deletePlayer = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body; 
    // ... (logic xóa người chơi)
    if (!name || name.trim() === '') {
        res.status(400).json({ message: 'Tên người chơi không được để trống.' });
        return;
    }
    try {
        const result = await Player.deleteOne({ name: name.trim() });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: `Không tìm thấy người chơi "${name}" để xóa.` });
            return;
        }
        res.status(200).json({
            message: `Người chơi "${name}" đã được xóa thành công!`
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi Server khi xóa người chơi.', error });
    }
};


// HÀM MỚI: GET thông tin người chơi theo ID (Giải quyết lỗi 404 bước 1)
const getPlayerById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ message: 'ID người chơi là bắt buộc.' });
        return;
    }
    try {
        const player = await Player.findById(id);
        if (!player) {
            res.status(404).json({ message: `Không tìm thấy người chơi với ID: ${id}.` });
            return;
        }
        res.status(200).json(player);
    } catch (error) {
        res.status(400).json({ 
             message: 'ID người chơi không hợp lệ. Vui lòng kiểm tra ID.', 
             error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// HÀM MỚI: PATCH cập nhật chi tiết người chơi (Giải quyết lỗi 404 bước 2)
const updatePlayerDetails = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updates = req.body; 
    if (!id || Object.keys(updates).length === 0) {
        res.status(400).json({ message: 'ID và dữ liệu cập nhật là bắt buộc.' });
        return;
    }
    const allowedUpdates = ['name', 'total_points', 'phone_number'];
    const actualUpdates: { [key: string]: any } = {};
    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            actualUpdates[key] = updates[key];
        }
    }
    if (actualUpdates.total_points !== undefined) {
        if (typeof actualUpdates.total_points !== 'number' || actualUpdates.total_points < 0) {
            res.status(400).json({ message: 'Tổng điểm phải là số không âm hợp lệ.' });
            return;
        }
        actualUpdates.rank = determinePlayerRank(actualUpdates.total_points);
    }
    if (Object.keys(actualUpdates).length === 0) {
        res.status(400).json({ message: 'Không có trường dữ liệu hợp lệ nào được cung cấp để cập nhật.' });
        return;
    }
    try {
        const updatedPlayer = await Player.findByIdAndUpdate(
            id, 
            { $set: actualUpdates }, 
            { new: true, runValidators: true }
        ) as (IPlayer & Document) | null;
        if (!updatedPlayer) {
            res.status(404).json({ message: `Không tìm thấy người chơi với ID: ${id}.` });
            return;
        }
        res.status(200).json({
            message: `Thông tin người chơi ${updatedPlayer.name} đã được cập nhật thành công!`,
            player: updatedPlayer
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Lỗi Server khi cập nhật thông tin người chơi.', 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
};


// EXPORT TẤT CẢ CÁC HÀM
export { 
    createPlayer, 
    getRankings, 
    updateMatchResult, 
    deletePlayer,
    getPlayerById, // <-- Phải được export
    updatePlayerDetails // <-- Phải được export
}