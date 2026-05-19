const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const postRoutes = require('./routes/posts');
const faceAuthRoutes = require('./routes/faceAuth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/faces', faceAuthRoutes);

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.json({ message: 'Chatty backend is running' });
});

module.exports = app;
