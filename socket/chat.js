const WebSocket = require('ws');
const Message = require('../models/Message');
const User = require('../models/User');

const clients = new Map();

async function broadcastStatus(userId, isOnline) {
  const statusMessage = JSON.stringify({
    type: 'status_update',
    userId,
    isOnline,
    lastSeen: new Date(),
  });

  for (const [id, clientWs] of clients.entries()) {
    if (id !== userId && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(statusMessage);
    }
  }
}

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    let userId = null;

    ws.on('message', async (messageText) => {
      try {
        const message = JSON.parse(messageText);
        console.log('Received message:', message);

        if (message.type === 'init') {
          userId = message.userId || message.fromUserId;
          console.log(`User ${userId} initialized connection`);
          if (userId) {
            clients.set(userId, ws);
            // Update user status in DB
            const updatedUser = await User.findOneAndUpdate(
              { userId: userId }, 
              { $set: { isOnline: true } }, 
              { new: true }
            );
            console.log(`Updated user ${userId} to online:`, updatedUser ? 'Success' : 'User not found in DB');
            if (updatedUser) {
              console.log('User data in DB after update:', updatedUser);
            }
            // Broadcast that user is online
            broadcastStatus(userId, true);
          } else {
            console.log('Init message received but no userId/fromUserId found');
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

    ws.on('close', async () => {
      if (userId) {
        console.log(`User ${userId} disconnected`);
        clients.delete(userId);
        // Update user status in DB
        await User.findOneAndUpdate({ userId }, { isOnline: false, lastSeen: new Date() });
        console.log(`Updated user ${userId} to offline`);
        // Broadcast that user is offline
        broadcastStatus(userId, false);
      }
    });
  });
}

module.exports = { setupWebSocket };
