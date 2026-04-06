const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

// All room routes are protected
router.use(protect);

// @route   GET /api/rooms
// @desc    Get all rooms for logged-in user
// @access  Private
router.get('/', async (req, res) => {
    try {
        const rooms = await Room.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, count: rooms.length, rooms });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching rooms.' });
    }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post(
    '/',
    [
        body('name').trim().notEmpty().withMessage('Room name is required'),
        body('dimensions.width').isFloat({ min: 1, max: 50 }).withMessage('Width must be between 1 and 50 meters'),
        body('dimensions.length').isFloat({ min: 1, max: 50 }).withMessage('Length must be between 1 and 50 meters'),
        body('dimensions.height').isFloat({ min: 2, max: 10 }).withMessage('Height must be between 2 and 10 meters'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        try {
            const room = await Room.create({ ...req.body, user: req.user._id });
            res.status(201).json({ success: true, room });
        } catch (error) {
            console.error('Create room error:', error);
            res.status(500).json({ success: false, message: 'Server error creating room.' });
        }
    }
);

// @route   GET /api/rooms/:id
// @desc    Get single room
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findOne({ _id: req.params.id, user: req.user._id });
        if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// @route   PUT /api/rooms/:id
// @desc    Update room (dimensions, colors, furnitureItems, etc.)
// @access  Private
router.put('/:id', async (req, res) => {
    try {
        // Destructure only the fields we allow to be updated
        const {
            name,
            type,
            dimensions,
            wallColor,
            floorColor,
            ceilingColor,
            wallColors,
            furnitureItems,
        } = req.body;

        // Build the $set payload – only include fields that were actually sent
        const updateFields = {};
        if (name            !== undefined) updateFields.name            = name;
        if (type            !== undefined) updateFields.type            = type;
        if (dimensions      !== undefined) updateFields.dimensions      = dimensions;
        if (wallColor       !== undefined) updateFields.wallColor       = wallColor;
        if (floorColor      !== undefined) updateFields.floorColor      = floorColor;
        if (ceilingColor    !== undefined) updateFields.ceilingColor    = ceilingColor;
        if (wallColors      !== undefined) updateFields.wallColors      = wallColors;
        if (furnitureItems  !== undefined) updateFields.furnitureItems  = furnitureItems;

        const room = await Room.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { $set: updateFields },          // $set keeps other fields intact
            { new: true, runValidators: false }  // skip validators – we trust the frontend
        );
        if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
        res.json({ success: true, room });
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ success: false, message: 'Server error updating room.' });
    }
});

// @route   DELETE /api/rooms/:id
// @desc    Delete room
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const room = await Room.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
        res.json({ success: true, message: 'Room deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error deleting room.' });
    }
});

module.exports = router;