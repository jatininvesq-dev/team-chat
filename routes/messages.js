const express = require('express');
const multer = require('multer');
const path = require('path');
const Message = require('../models/Message');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/with/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    const otherUser = await User.findOne({ userId: otherUserId }).select('userId name email isOnline lastSeen');

    res.json({
      messages,
      otherUser: otherUser ? {
        userId: otherUser.userId,
        name: otherUser.name,
        email: otherUser.email,
        isOnline: otherUser.isOnline,
        lastSeen: otherUser.lastSeen,
      } : null
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Server error while fetching chat history.' });
  }
});

router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: currentUserId },
            { toUserId: currentUserId },
          ],
        },
      },
      {
        $project: {
          otherUserId: {
            $cond: [
              { $eq: ['$fromUserId', currentUserId] },
              '$toUserId',
              '$fromUserId',
            ],
          },
          content: 1,
          fromUserId: 1,
          toUserId: 1,
          createdAt: 1,
        },
      },
      { $match: { otherUserId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          lastFromUserId: { $first: '$fromUserId' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'userId',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          otherUserId: '$_id',
          lastMessage: 1,
          lastMessageAt: 1,
          lastFromUserId: 1,
          user: {
            userId: '$user.userId',
            name: '$user.name',
            email: '$user.email',
            isOnline: '$user.isOnline',
            lastSeen: '$user.lastSeen',
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error while fetching conversations.' });
  }
});

router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Server error during file upload.' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found.' });
    }

    if (message.fromUserId !== currentUserId) {
      return res.status(403).json({ error: 'You can only delete your own messages.' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error while deleting message.' });
  }
});

router.delete('/conversation/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { otherUserId } = req.params;

    await Message.deleteMany({
      $or: [
        { fromUserId: currentUserId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: currentUserId },
      ],
    });

    res.json({ message: 'Conversation cleared successfully.' });
  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({ error: 'Server error while clearing conversation.' });
  }
});

module.exports = router;
