const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebaseService = require('../services/firebaseService');

// Middleware to verify Firebase token
const verifyToken = firebaseService.verifyTokenMiddleware.bind(firebaseService);
const optionalVerifyToken = firebaseService.optionalTokenMiddleware.bind(firebaseService);

// Get default templates
router.get('/fetch-default-template-ext', optionalVerifyToken, async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    const templates = await firebaseService.getDocuments('templates', [
      { field: 'userId', operator: '==', value: userId }
    ]);
    
    console.log(`Retrieved ${templates.length} templates for user: ${userId}`);
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new template
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.uid;

    // Validate required fields
    if (!title || !userId) {
      return res.status(400).json({
        error: 'title and userId are required'
      });
    }

    // Create template data (simplified)
    const templateData = {
      title,
      userId: userId
    };

    // Save to database
    const result = await firebaseService.addDocument('templates', templateData);
    
    console.log(`Created template: ${result.id} for user: ${userId}`);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template
router.put('/:templateId', verifyToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    if (!templateId) {
      return res.status(400).json({
        error: 'templateId is required'
      });
    }

    // Verify template belongs to user
    const template = await firebaseService.getDocument('templates', templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update template
    const result = await firebaseService.updateDocument('templates', templateId, updateData);
    
    console.log(`Updated template: ${templateId}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete template
router.delete('/:templateId', verifyToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const userId = req.user.uid;

    if (!templateId) {
      return res.status(400).json({
        error: 'templateId is required'
      });
    }

    // Verify template belongs to user
    const template = await firebaseService.getDocument('templates', templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete template
    await firebaseService.deleteDocument('templates', templateId);

    console.log(`Deleted template: ${templateId}`);
    
    res.status(204).send('');
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get template details
router.get('/:templateId', optionalVerifyToken, async (req, res) => {
  try {
    const { templateId } = req.params;

    if (!templateId) {
      return res.status(400).json({
        error: 'templateId is required'
      });
    }

    const template = await firebaseService.getDocument('templates', templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    console.log(`Retrieved template details: ${templateId}`);
    
    res.json(template);
  } catch (error) {
    console.error('Error getting template details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
