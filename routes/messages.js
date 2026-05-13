const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

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

    res.json({ messages });
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

module.exports = router;
