const http = require('http');
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const dotenv = require('dotenv');

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const { connectDatabase } = require('./config/db');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const { setupWebSocket } = require('./socket/chat');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Chatty backend is running' });
});

const server = http.createServer(app);

const PORT = process.env.PORT || 8080;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other process or set a different PORT in .env.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

connectDatabase()
  .then(() => {
    setupWebSocket(server);
    server.listen(PORT, '192.168.1.14', () => {
      console.log(`Server running on http://192.168.1.14:${PORT}`);
      console.log('WebSocket server is ready');
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
