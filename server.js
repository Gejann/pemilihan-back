const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB Atlas connection error:', err));

// Schemas
const optionSchema = new mongoose.Schema({
    title: String,
    imagePath: String,
    isActive: { type: Boolean, default: true }
});

const voteSchema = new mongoose.Schema({
    nama: String,
    kelas: String,
    pilihan: String,
    waktu: { type: Date, default: Date.now }
});

const Option = mongoose.model('Option', optionSchema);
const Vote = mongoose.model('Vote', voteSchema);

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// Routes
app.post('/api/options', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const option = new Option({
            title: req.body.title,
            imagePath: `/uploads/${req.file.filename}`
        });

        await option.save();
        res.status(201).json(option);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/options', async (req, res) => {
    try {
        const options = await Option.find({ isActive: true });
        res.json(options);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/vote', async (req, res) => {
    try {
        const vote = new Vote(req.body);
        await vote.save();
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        const votes = await Vote.find().sort({ waktu: -1 });
        res.json(votes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});