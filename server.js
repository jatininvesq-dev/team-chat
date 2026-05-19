const http = require('http');
const dns = require('dns');
const dotenv = require('dotenv');

const app = require('./app');
const { connectDatabase } = require('./config/db');
const { setupWebSocket } = require('./socket/chat');

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Please stop the other process or set a different PORT in .env.`
    );
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

connectDatabase()
  .then(() => {
    setupWebSocket(server);
    server.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log('WebSocket server is ready (local only — not available on Netlify Functions)');
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
