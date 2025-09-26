const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebaseService = require('../services/firebaseService');
const supabaseService = require('../services/supabaseService');

// Middleware to verify Firebase token
const verifyToken = firebaseService.verifyTokenMiddleware.bind(firebaseService);
const optionalVerifyToken = firebaseService.optionalTokenMiddleware.bind(firebaseService);

// Get user by email (legacy endpoint)
router.get('/asd3fd2faec', optionalVerifyToken, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: 'email is required'
      });
    }

    const users = await firebaseService.getDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    console.log(`Retrieved user by email: ${email}`);
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name || null
    });
  } catch (error) {
    console.error('Error getting user by email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or get user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    const userId = req.user.uid;

    if (!email) {
      return res.status(400).json({
        error: 'email is required'
      });
    }

    // Check if user already exists
    const existingUsers = await firebaseService.getDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log(`User already exists: ${userId}`);
      return res.status(200).json(existingUsers[0]);
    }

    // Create new user (simplified)
    const userData = {
      email,
      name: name || null
    };

    const result = await firebaseService.addDocument('users', userData);
    
    console.log(`Created user: ${result.id} for Firebase UID: ${userId}`);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const users = await firebaseService.getDocuments('users');
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const user = users[0];
    
    console.log(`Retrieved user profile: ${userId}`);
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const updateData = req.body;

    // Update user
    const users = await firebaseService.getDocuments('users');
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const result = await firebaseService.updateDocument('users', users[0].id, updateData);
    
    console.log(`Updated user profile: ${userId}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user profile
router.delete('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get user's sessions and patients for cleanup
    const sessions = await firebaseService.getDocuments('sessions', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    const patients = await firebaseService.getDocuments('patients', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    // Delete user's audio chunks and files
    for (const session of sessions) {
      const chunks = await firebaseService.getDocuments('audio_chunks', [
        { field: 'sessionId', operator: '==', value: session.id }
      ]);
      
      for (const chunk of chunks) {
        try {
          const fileName = chunk.gcsPath.replace('sessions/', '');
          await supabaseService.deleteFile(fileName);
        } catch (error) {
          console.error(`Error deleting file ${chunk.gcsPath}:`, error);
        }
      }
    }

    // Delete user's data
    const users = await firebaseService.getDocuments('users');
    
    if (users && users.length > 0) {
      await firebaseService.deleteDocument('users', users[0].id);
    }

    console.log(`Deleted user profile and associated data: ${userId}`);
    
    res.json({ success: true, message: 'User profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Get counts
    const patients = await firebaseService.getDocuments('patients', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    const sessions = await firebaseService.getDocuments('sessions', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    const templates = await firebaseService.getDocuments('templates', [
      { field: 'userId', operator: '==', value: userId }
    ]);

    // Calculate statistics
    const stats = {
      totalPatients: patients.length,
      totalSessions: sessions.length,
      totalTemplates: templates.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      pendingSessions: sessions.filter(s => s.status === 'in_progress').length
    };

    console.log(`Retrieved user stats: ${userId}`);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
