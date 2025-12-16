// src/models/score.model.ts (Updated Schema)

import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
    name: string;
    total_points: number;
    rank: string; 
    phone_number: string; 
}

const PlayerSchema: Schema = new Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true 
    },
    total_points: { 
        type: Number, 
        required: true, 
        default: 40 
    },
    rank: { 
        type: String, 
        required: false, 
        default: 'E' 
    },
    phone_number: {
        type: String,
        required: false, 
        default: ''
    }
});

export default mongoose.model<IPlayer>('Player', PlayerSchema);