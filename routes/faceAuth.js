const express = require('express');
const router = express.Router();
const FaceData = require('../models/FaceData');
const authenticateToken = require('../middleware/auth'); 

// Helper function to calculate similarity (Euclidean distance)
function euclideanDistance(emb1, emb2) {
  if (emb1.length !== emb2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < emb1.length; i++) {
    const diff = emb1[i] - emb2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Threshold: If distance is less than this, it's considered the same face.
const FACE_MATCH_THRESHOLD = 0.8; 

router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { faceEmbedding } = req.body;

    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res.status(400).json({ error: 'Invalid face embedding data.' });
    }

    // 1. Fetch all registered faces to check for duplicates
    const allFaces = await FaceData.find();

    // 2. Check if face is already registered by someone else
    for (const faceRecord of allFaces) {
      // Don't compare with own face if already registered
      if (faceRecord.userId === req.user.userId) continue;

      const distance = euclideanDistance(faceEmbedding, faceRecord.faceEmbedding);
      
      if (distance < FACE_MATCH_THRESHOLD) {
        return res.status(400).json({ 
          error: 'This face is already registered with another account.' 
        });
      }
    }

    // Check if current user already has a face registered
    let existingFaceData = await FaceData.findOne({ userId: req.user.userId });
    
    if (existingFaceData) {
      // Update existing face data
      existingFaceData.faceEmbedding = faceEmbedding;
      await existingFaceData.save();
      
      return res.status(200).json({
        message: 'Face data updated successfully.',
        data: existingFaceData
      });
    }

    // 3. If no match is found, save the new face data
    const newFaceData = new FaceData({
      userId: req.user.userId, 
      faceEmbedding: faceEmbedding
    });

    await newFaceData.save();

    res.status(201).json({
      message: 'Face data registered successfully.',
      data: newFaceData
    });

  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
