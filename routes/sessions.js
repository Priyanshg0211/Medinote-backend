const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebaseService = require('../services/firebaseService');
const supabaseService = require('../services/supabaseService');

// Middleware to verify Firebase token
const verifyToken = firebaseService.verifyTokenMiddleware.bind(firebaseService);
const optionalVerifyToken = firebaseService.optionalTokenMiddleware.bind(firebaseService);

// Create new session
router.post('/upload-session', verifyToken, async (req, res) => {
  try {
    const { patientId, patientName } = req.body;

    const userId = req.user.uid;

    // Validate required fields
    if (!patientId || !userId) {
      return res.status(400).json({
        error: 'patientId and userId are required'
      });
    }

    // Create session data (simplified)
    const sessionData = {
      patientId: patientId,
      userId: userId,
      patientName: patientName || null,
      status: 'in_progress',
      startTime: new Date().toISOString(),
      chunksUploaded: 0,
      totalChunks: 0
    };

    // Save to database
    const result = await firebaseService.addDocument('sessions', sessionData);
    
    console.log(`Created session: ${result.id} for user: ${userId}`);

    res.status(201).json({ id: result.id });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sessions for a user
router.get('/all-session', optionalVerifyToken, async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const sessions = await firebaseService.getDocuments('sessions', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    
    // Get patient information for each session
    const patientMap = {};
    const patientIds = [...new Set(sessions.map(s => s.patientId))];
    
    for (const patientId of patientIds) {
      const patient = await firebaseService.getDocument('patients', patientId);
      if (patient) {
        patientMap[patientId] = {
          name: patient.name,
          pronouns: patient.pronouns || null
        };
      }
    }

    // Format sessions for response (simplified)
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      patientId: session.patientId,
      status: session.status || null,
      date: session.startTime ? session.startTime.split('T')[0] : null,
      startTime: session.startTime || null,
      patientName: session.patientName || null
    }));

    console.log(`Retrieved ${sessions.length} sessions for user: ${userId}`);
    
    res.json({
      sessions: formattedSessions,
      patientMap
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session details
router.get('/:sessionId', optionalVerifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    const session = await firebaseService.getDocument('sessions', sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    console.log(`Retrieved session details: ${sessionId}`);
    
    res.json(session);
  } catch (error) {
    console.error('Error getting session details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update session
router.put('/:sessionId', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

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

    // Update session
    const result = await firebaseService.updateDocument('sessions', sessionId, updateData);
    
    console.log(`Updated session: ${sessionId}`);
    
    res.json({ session: result });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete session
router.delete('/:sessionId', verifyToken, async (req, res) => {
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

    console.log(`Deleted session: ${sessionId}`);
    
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session chunks
router.get('/:sessionId/chunks', optionalVerifyToken, async (req, res) => {
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

    console.log(`Retrieved ${chunks.length} chunks for session: ${sessionId}`);
    
    res.json({ chunks });
  } catch (error) {
    console.error('Error getting session chunks:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
