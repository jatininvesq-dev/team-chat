const express = require('express');
const cors = require('cors');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const postRoutes = require('./routes/posts');
const faceAuthRoutes = require('./routes/faceAuth');
const { getUploadDir, isServerless } = require('./utils/multerStorage');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
// Shorter paths for deployed frontend: /api/login, /api/register, etc.
app.use('/api', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/faces', faceAuthRoutes);

// Static uploads only for local server (Netlify filesystem is read-only except /tmp)
if (!isServerless()) {
  const uploadDir = getUploadDir();
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir));
}

app.get('/', (req, res) => {
  res.json({ message: 'Chatty backend is running' });
});

module.exports = app;
