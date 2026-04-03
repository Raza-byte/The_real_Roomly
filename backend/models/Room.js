const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        name: {
            type: String,
            required: [true, 'Room name is required'],
            trim: true,
            maxlength: [100, 'Room name cannot exceed 100 characters'],
        },
        type: {
            type: String,
            enum: ['living_room', 'bedroom', 'kitchen', 'bathroom', 'office', 'empty'],
            default: 'empty',
        },
        dimensions: {
            width: {
                type: Number,
                required: [true, 'Width is required'],
                min: [1, 'Width must be at least 1 meter'],
                max: [50, 'Width cannot exceed 50 meters'],
            },
            length: {
                type: Number,
                required: [true, 'Length is required'],
                min: [1, 'Length must be at least 1 meter'],
                max: [50, 'Length cannot exceed 50 meters'],
            },
            height: {
                type: Number,
                required: [true, 'Height is required'],
                min: [2, 'Height must be at least 2 meters'],
                max: [10, 'Height cannot exceed 10 meters'],
                default: 2.8,
            },
        },
        wallColor: {
            type: String,
            default: '#F5F0EB',
        },
        floorColor: {
            type: String,
            default: '#C8A882',
        },
        ceilingColor: {
            type: String,
            default: '#FFFFFF',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Room', roomSchema);