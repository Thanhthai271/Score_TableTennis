// src/controllers/score.controller.ts (Phiên bản Hoàn chỉnh và Tối ưu)

import { Request, Response } from 'express';
// Giả định bạn đã sửa lỗi import/export trong score.model.ts để sử dụng Named Import cho IPlayer
import Player, { IPlayer } from '../models/score.model'; 

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
    pointsA: number;
    pointsB: number;
    error?: string;
}

const calculateRankingPoints = (setA: number, setB: number): CalculatedPoints => {
    let pointsA = 0;
    let pointsB = 0;

    if (setA !== 3 && setB !== 3 || setA === setB) {
        return { pointsA: 0, pointsB: 0, error: "Tỉ số không hợp lệ. Kết quả phải là 3-0, 3-1, hoặc 3-2." };
    }

    let key: string;
    let points: number;

    if (setA > setB) { // A thắng
        key = `${setA}-${setB}`;
        points = SCORE_MAP[key];
        pointsA = points;
        pointsB = -points;
    } else if (setB > setA) { // B thắng
        key = `${setB}-${setA}`;
        points = SCORE_MAP[key];
        pointsB = points;
        pointsA = -points;
    }

    return { pointsA, pointsB };
};

// CẬP NHẬT: Logic phân hạng dựa trên điểm (A0 là cao nhất, giới hạn A0 ở 580)
const determinePlayerRank = (totalPoints: number): string => {
    const { BASE_POINT, POINT_STEP, RANKS } = RANK_CONFIG;
    
    // Giới hạn cao nhất
    const MAX_POINTS_FOR_A0 = 580; 

    // Nếu đạt 580 điểm trở lên, gán A0 (hạng cao nhất)
    if (totalPoints >= MAX_POINTS_FOR_A0) {
        return RANKS[RANKS.length - 1]; // 'A0'
    }

    if (totalPoints < BASE_POINT) return RANKS[0]; // 'E'

    // Tính toán index dựa trên công thức
    let rankIndex = Math.floor((totalPoints - BASE_POINT) / POINT_STEP);
    
    // Đảm bảo không vượt quá A1 (index cuối cùng trước A0)
    const maxRankIndex = RANKS.length - 2; 

    if (rankIndex >= maxRankIndex) {
        return RANKS[maxRankIndex]; // 'A1'
    }

    return RANKS[rankIndex];
};


// --- API Controller Methods ---

// POST: Tạo người chơi (CẬP NHẬT: Server tự tính Hạng)
const createPlayer = async (req: Request, res: Response): Promise<void> => {
    const { 
        name, 
        total_points, 
        phone_number 
    } = req.body; 

    // 1. Kiểm tra dữ liệu bắt buộc và tính hợp lệ (Chỉ cần Tên và Điểm)
    if (!name || name.trim() === '') {
        res.status(400).json({ message: 'Tên người chơi không được để trống.' });
        return;
    }
    
    if (total_points === undefined) {
        res.status(400).json({ message: 'Tổng điểm là bắt buộc.' });
        return;
    }

    if (typeof total_points !== 'number' || total_points < 0) {
        res.status(400).json({ message: 'Tổng điểm phải là số không âm hợp lệ.' });
        return;
    }
    
    // --- BƯỚC MỚI: TÍNH TOÁN HẠNG TỰ ĐỘNG ---
    const calculatedRank = determinePlayerRank(total_points);

    try {
        // Kiểm tra xem người chơi đã tồn tại chưa
        const existingPlayer = await Player.findOne({ name: name.trim() });

        if (existingPlayer) {
            res.status(409).json({ message: `Người chơi "${name}" đã tồn tại.` });
            return;
        }

        // Tạo đối tượng Player mới (Có Rank đã được tính)
        const newPlayer = new Player({
            name: name.trim(),
            total_points: total_points,
            rank: calculatedRank, // GÁN HẠNG TỪ KẾT QUẢ TÍNH TOÁN
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
        // Sau khi sửa Model, lỗi này sẽ ít xảy ra hơn
        res.status(500).json({ 
            message: 'Lỗi Server khi tạo người chơi.', 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
};

// GET: Lấy bảng xếp hạng
const getRankings = async (req: Request, res: Response): Promise<void> => {
    try {
        // Sắp xếp theo total_points giảm dần
        const rankings = await Player.find().sort({ total_points: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy dữ liệu xếp hạng.', error });
    }
};

// POST: Cập nhật kết quả trận đấu 
const updateMatchResult = async (req: Request, res: Response): Promise<void> => {
    const { p1_name, p2_name, set1, set2 } = req.body;

    if (!p1_name || !p2_name || typeof set1 !== 'number' || typeof set2 !== 'number') {
        res.status(400).json({ message: 'Thiếu dữ liệu đầu vào.' });
        return;
    }

    try {
        // 1. Tìm người chơi. (Ép kiểu kết quả sang IPlayer & Document để TypeScript hiểu)
        const p1 = await Player.findOne({ name: p1_name }) as (IPlayer & Document) | null; 
        const p2 = await Player.findOne({ name: p2_name }) as (IPlayer & Document) | null; 

        if (!p1 || !p2) {
            res.status(404).json({ message: 'Không tìm thấy một hoặc cả hai người chơi.' });
            return;
        }

        // 2. Tính toán điểm
        const { pointsA, pointsB, error } = calculateRankingPoints(set1, set2);

        if (error) {
            res.status(400).json({ message: error });
            return;
        }

        // 3. Cập nhật dữ liệu
        p1.total_points += pointsA;
        p2.total_points += pointsB;
        p1.rank = determinePlayerRank(p1.total_points); 
        p2.rank = determinePlayerRank(p2.total_points);

        // 4. Lưu vào Database
        await p1.save();
        await p2.save();

        res.status(200).json({
            message: 'Cập nhật kết quả thành công!',
            p1_update: { points: pointsA, new_rank: p1.rank },
            p2_update: { points: pointsB, new_rank: p2.rank }
        });

    } catch (error) {
        res.status(500).json({ message: 'Lỗi Server khi xử lý trận đấu.', error });
    }
};

// DELETE: Xóa người chơi theo tên
const deletePlayer = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body; 

    if (!name || name.trim() === '') {
        res.status(400).json({ message: 'Tên người chơi không được để trống.' });
        return;
    }

    try {
        // Tìm và xóa người chơi
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

// THÊM CÁC HÀM SỬA/LẤY THEO ID (Nếu đã cập nhật Router)
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
        res.status(400).json({ message: 'ID người chơi không hợp lệ.', error });
    }
};

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
    getPlayerById,
    updatePlayerDetails 
}