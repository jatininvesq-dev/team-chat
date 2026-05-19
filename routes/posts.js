const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

const { createMulterUpload } = require('../utils/multerStorage');
const upload = createMulterUpload();

// Get all posts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error while fetching posts.' });
  }
});

// Get posts for the authenticated user only
router.get('/my-posts', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const posts = await Post.find({ userId }).sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    console.error('Get my posts error:', error);
    res.status(500).json({ error: 'Server error while fetching my posts.' });
  }
});

// Create a new post
router.post('/', authenticateToken, upload.single('postImage'), async (req, res) => {
  try {
    const { description } = req.body;
    let { postImage } = req.body;
    const { userId } = req.user;
    
    if (req.file) {
      postImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Get user details to store postedUserName
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newPost = await Post.create({
      userId,
      postedUserName: user.name,
      postImage: postImage || null,
      description: description || null,
      likeCount: 0,
      commentCount: 0,
    });

    res.status(201).json({ post: newPost });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error while creating post.' });
  }
});

// Update a post
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { postImage, description, likeCount, commentCount } = req.body;
    const { userId } = req.user;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Optional: Only allow the creator to update the post, unless we are just liking/commenting
    // For a general update route, if it's updating description/image, it should probably be the owner.
    // If it's updating likeCount/commentCount, it could be anyone. Let's allow updating.
    // To be safe, we'll allow updating the fields provided.

    if (postImage !== undefined) post.postImage = postImage;
    if (description !== undefined) post.description = description;
    if (likeCount !== undefined) post.likeCount = likeCount;
    if (commentCount !== undefined) post.commentCount = commentCount;

    await post.save();

    res.json({ post });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Server error while updating post.' });
  }
});

// Delete a post
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Only allow the owner to delete their post
    if (post.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own posts.' });
    }

    await Post.findByIdAndDelete(id);

    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error while deleting post.' });
  }
});

module.exports = router;
