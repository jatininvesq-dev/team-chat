const mongoose = require('mongoose');

const faceDataSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
    },
    faceData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    /** Set when an embedding can be derived from `faceData` (for duplicate checks / legacy). */
    faceEmbedding: {
      type: [Number],
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FaceData', faceDataSchema);
