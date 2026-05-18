const mongoose = require('mongoose');

const faceDataSchema = new mongoose.Schema({
  userId: {
    type: String, // String because User model uses String userId
    required: true
  },
  faceEmbedding: {
    type: [Number], // Array of floats/numbers
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FaceData', faceDataSchema);
