require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/room'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Interior App API is running 🏠' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});