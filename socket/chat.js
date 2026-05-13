const WebSocket = require('ws');
const Message = require('../models/Message');

const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    let userId = null;

    ws.on('message', async (messageText) => {
      try {
        const message = JSON.parse(messageText);

        if (message.type === 'init') {
          userId = message.userId;
          if (userId) {
            clients.set(userId, ws);
          }
          return;
        }

        if (message.type === 'message') {
          const { fromUserId, toUserId, content, fileUrl, fileType, fileName } = message;
          if (!fromUserId || (!content && !fileUrl)) {
            ws.send(JSON.stringify({ type: 'error', error: 'fromUserId and either content or fileUrl are required.' }));
            return;
          }

          if (userId && fromUserId !== userId) {
            ws.send(JSON.stringify({ type: 'error', error: 'fromUserId must match the connected user.' }));
            return;
          }

          const savedMessage = await Message.create({
            fromUserId,
            toUserId: toUserId || null,
            content: content || '',
            fileUrl: fileUrl || null,
            fileType: fileType || null,
            fileName: fileName || null,
          });

          const outbound = JSON.stringify({
            type: 'message',
            message: {
              id: savedMessage._id,
              fromUserId: savedMessage.fromUserId,
              toUserId: savedMessage.toUserId,
              content: savedMessage.content,
              fileUrl: savedMessage.fileUrl,
              fileType: savedMessage.fileType,
              fileName: savedMessage.fileName,
              createdAt: savedMessage.createdAt,
            },
          });

          if (toUserId) {
            const recipient = clients.get(toUserId);
            if (recipient && recipient.readyState === WebSocket.OPEN) {
              recipient.send(outbound);
            }
          } else {
            for (const [otherUserId, clientWs] of clients.entries()) {
              if (otherUserId !== userId && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(outbound);
              }
            }
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(outbound);
          }
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format.' }));
        }
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });
}

module.exports = { setupWebSocket };
