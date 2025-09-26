const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebaseService = require('../services/firebaseService');

// Middleware to verify Firebase token
const verifyToken = firebaseService.verifyTokenMiddleware.bind(firebaseService);
const optionalVerifyToken = firebaseService.optionalTokenMiddleware.bind(firebaseService);

// Get all patients for a user
router.get('/', optionalVerifyToken, async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const patients = await firebaseService.getDocuments('patients', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    
    console.log(`Retrieved ${patients.length} patients for user: ${userId}`);
    
    res.json({ patients });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add patient extended
router.post('/add-patient-ext', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;

    const userId = req.user.uid;

    // Validate required fields
    if (!name || !userId) {
      return res.status(400).json({
        error: 'Name and userId are required'
      });
    }

    // Create patient data (simplified)
    const patientData = {
      name,
      userId: userId
    };

    // Save to database
    const result = await firebaseService.addDocument('patients', patientData);
    
    console.log(`Created patient: ${result.id} for user: ${userId}`);

    res.status(201).json({ patient: result });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient details
router.get('/:patientId', optionalVerifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        error: 'patientId is required'
      });
    }

    const patient = await firebaseService.getDocument('patients', patientId);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    console.log(`Retrieved patient details: ${patientId}`);
    
    res.json(patient);
  } catch (error) {
    console.error('Error getting patient details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient
router.put('/:patientId', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: 'patientId is required'
      });
    }

    // Verify patient belongs to user
    const patient = await firebaseService.getDocument('patients', patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (patient.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update patient
    const result = await firebaseService.updateDocument('patients', patientId, updateData);
    
    console.log(`Updated patient: ${patientId}`);
    
    res.json({ patient: result });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
router.delete('/:patientId', verifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const userId = req.user.uid;

    if (!patientId) {
      return res.status(400).json({
        error: 'patientId is required'
      });
    }

    // Verify patient belongs to user
    const patient = await firebaseService.getDocument('patients', patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (patient.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete patient
    await firebaseService.deleteDocument('patients', patientId);
    
    console.log(`Deleted patient: ${patientId}`);
    
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sessions for a patient
router.get('/:patientId/sessions', optionalVerifyToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        error: 'patientId is required'
      });
    }

    const sessions = await firebaseService.getDocuments('sessions', [
      { field: 'patientId', operator: '==', value: patientId }
    ]);
    
    // Format sessions for response (simplified)
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      date: session.startTime ? session.startTime.split('T')[0] : null,
      startTime: session.startTime || null,
      status: session.status || null
    }));

    console.log(`Retrieved ${sessions.length} sessions for patient: ${patientId}`);
    
    res.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Error getting patient sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
