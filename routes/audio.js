const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebaseService = require('../services/firebaseService');
const supabaseService = require('../services/supabaseService');

// Middleware to verify Firebase token (optional for some endpoints)
const verifyToken = firebaseService.verifyTokenMiddleware.bind(firebaseService);
const optionalVerifyToken = firebaseService.optionalTokenMiddleware.bind(firebaseService);

// 1. Get Presigned URL for Audio Upload (Supabase Storage)
router.post('/get-presigned-url', optionalVerifyToken, async (req, res) => {
  try {
    const { sessionId, chunkNumber, mimeType } = req.body;

    // Validate required fields
    if (!sessionId || typeof chunkNumber === 'undefined' || !mimeType) {
      return res.status(400).json({
        error: 'sessionId, chunkNumber, and mimeType are required'
      });
    }

    // Create file name
    const extension = mimeType.includes('mp3') ? 'mp3' : 'wav';
    const fileName = `${sessionId}/chunk_${chunkNumber}.${extension}`;

    // Generate presigned URL from Supabase
    const presignedData = await supabaseService.generatePresignedUrl(fileName, mimeType);

    console.log(`Generated presigned URL for session: ${sessionId}, chunk: ${chunkNumber}`);

    res.json(presignedData);
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Notify Chunk Uploaded
router.post('/notify-chunk-uploaded', optionalVerifyToken, async (req, res) => {
  try {
    const {
      sessionId,
      gcsPath,
      chunkNumber,
      isLast,
      totalChunksClient,
      publicUrl,
      mimeType,
      selectedTemplate,
      selectedTemplateId,
      model
    } = req.body;

    // Validate required fields
    if (!sessionId || !gcsPath || typeof chunkNumber === 'undefined') {
      return res.status(400).json({
        error: 'sessionId, gcsPath, and chunkNumber are required'
      });
    }

    // Save chunk info to Firebase (store Supabase URL and metadata)
    const chunkData = {
      sessionId: sessionId,
      chunkNumber: chunkNumber,
      gcsPath: gcsPath,
      publicUrl: publicUrl,
      mimeType: mimeType,
      isLast: isLast || false,
      uploadedAt: new Date().toISOString()
    };

    await firebaseService.addDocument('audio_chunks', chunkData);

    // Update session with chunk count
    const session = await firebaseService.getDocument('sessions', sessionId);
    if (session) {
      const currentChunks = session.chunksUploaded || 0;
      await firebaseService.updateDocument('sessions', sessionId, {
        chunksUploaded: currentChunks + 1
      });
    }

    console.log(`Chunk ${chunkNumber} uploaded for session: ${sessionId}`);

    // If this is the last chunk, mark session as completed
    if (isLast) {
      // Update session with total chunks and template info
      await firebaseService.updateDocument('sessions', sessionId, {
        totalChunks: totalChunksClient,
        templateId: selectedTemplateId,
        model: model,
        status: 'completed',
        endTime: new Date().toISOString()
      });

      console.log(`Last chunk received for session: ${sessionId}, session completed`);
    }

    res.json({
      success: true,
      message: "Chunk processed successfully",
      status: isLast ? "completed" : "collecting"
    });
  } catch (error) {
    console.error('Error processing chunk notification:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Session Chunks
router.get('/session/:sessionId/chunks', optionalVerifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    const chunks = await firebaseService.getDocuments('audio_chunks', [
      { field: 'sessionId', operator: '==', value: sessionId }
    ]);
    
    // Sort by chunk number
    chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

    res.json({ chunks });
  } catch (error) {
    console.error('Error getting session chunks:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Delete Session and Associated Chunks
router.delete('/session/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    // Verify session belongs to user
    const session = await firebaseService.getDocument('sessions', sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all chunks for this session
    const chunks = await firebaseService.getDocuments('audio_chunks', [
      { field: 'sessionId', operator: '==', value: sessionId }
    ]);

    // Delete audio files from Supabase storage
    for (const chunk of chunks) {
      try {
        const fileName = chunk.gcsPath.replace('sessions/', '');
        await supabaseService.deleteFile(fileName);
      } catch (error) {
        console.error(`Error deleting file ${chunk.gcsPath}:`, error);
      }
    }

    // Delete chunks from database
    for (const chunk of chunks) {
      await firebaseService.deleteDocument('audio_chunks', chunk.id);
    }

    // Delete session from database
    await firebaseService.deleteDocument('sessions', sessionId);

    console.log(`Session ${sessionId} and associated chunks deleted`);

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
