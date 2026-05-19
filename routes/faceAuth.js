const express = require('express');
const router = express.Router();
const FaceData = require('../models/FaceData');

// Helper function to calculate similarity (Euclidean distance)
function euclideanDistance(emb1, emb2) {
  if (!emb1 || !emb2 || emb1.length !== emb2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < emb1.length; i++) {
    const diff = emb1[i] - emb2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Pull a numeric embedding array from client `faceData` (various shapes). */
function extractEmbedding(faceData) {
  if (faceData == null) return null;
  if (Array.isArray(faceData) && faceData.every((n) => typeof n === 'number')) {
    return faceData;
  }
  if (typeof faceData === 'object') {
    if (Array.isArray(faceData.faceEmbedding) && faceData.faceEmbedding.every((n) => typeof n === 'number')) {
      return faceData.faceEmbedding;
    }
    if (Array.isArray(faceData.embedding) && faceData.embedding.every((n) => typeof n === 'number')) {
      return faceData.embedding;
    }
  }
  return null;
}

function recordEmbedding(doc) {
  if (doc.faceEmbedding && doc.faceEmbedding.length) return doc.faceEmbedding;
  return extractEmbedding(doc.faceData);
}

// Threshold: If distance is less than this, it's considered the same face.
const FACE_MATCH_THRESHOLD = 0.8;

router.post('/register', async (req, res) => {
  try {
    const { faceData } = req.body;

    if (faceData === undefined || faceData === null) {
      return res.status(400).json({ error: 'faceData is required in the request body.' });
    }

    const faceEmbedding = extractEmbedding(faceData);

    if (faceEmbedding) {
      const allFaces = await FaceData.find();

      for (const faceRecord of allFaces) {
        const otherEmb = recordEmbedding(faceRecord);
        if (!otherEmb) continue;

        const distance = euclideanDistance(faceEmbedding, otherEmb);

        if (distance < FACE_MATCH_THRESHOLD) {
          return res.status(400).json({
            error: 'This face is already registered.',
          });
        }
      }
    }

    const payload = { faceData };
    if (faceEmbedding) {
      payload.faceEmbedding = faceEmbedding;
    }

    const newFaceData = new FaceData(payload);
    await newFaceData.save();

    res.status(201).json({
      message: 'Face data registered successfully.',
      data: newFaceData,
    });
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
