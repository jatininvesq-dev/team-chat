const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    postedUserName: {
      type: String,
      required: true,
    },
    postImage: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Post', postSchema);
