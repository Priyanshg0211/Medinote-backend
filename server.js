const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'audio/*', limit: '50mb' }));

// Import services
const firebaseService = require('./services/firebaseService');
const supabaseService = require('./services/supabaseService');

// Import routes
const audioRoutes = require('./routes/audio');
const patientRoutes = require('./routes/patients');
const sessionRoutes = require('./routes/sessions');
const templateRoutes = require('./routes/templates');
const userRoutes = require('./routes/users');

// Use routes
app.use('/api/v1', audioRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1', sessionRoutes);
app.use('/api/v1', templateRoutes);
app.use('/api', userRoutes);

// Collections overview for debugging/inspection
app.get('/api/v1/collections', async (req, res) => {
  try {
    const users = await firebaseService.getDocuments('users');
    const patients = await firebaseService.getDocuments('patients');
    const sessions = await firebaseService.getDocuments('sessions');
    const templates = await firebaseService.getDocuments('templates');
    
    res.json({ users, patients, sessions, templates });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug and Health Check
app.get('/debug/sessions', async (req, res) => {
  try {
    const sessions = await firebaseService.getDocuments('sessions');
    const patients = await firebaseService.getDocuments('patients');
    const users = await firebaseService.getDocuments('users');
    const templates = await firebaseService.getDocuments('templates');
    
    res.json({
      sessions: sessions,
      totalSessions: sessions.length,
      patients: patients,
      users: users,
      templates: templates
    });
  } catch (error) {
    console.error('Error getting debug sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    name: "MediNote Backend API",
    version: "1.0.0",
    status: "running",
    description: "Medical transcription app backend for Attack Capital assignment",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: "/health",
      debug: "/debug/sessions",
      api: "/api/v1",
      patients: "/api/v1/patients",
      sessions: "/api/v1/upload-session",
      templates: "/api/v1/fetch-default-template-ext",
      presignedUrl: "/api/v1/get-presigned-url",
      chunkNotify: "/api/v1/notify-chunk-uploaded",
      addPatientExt: "/api/v1/patients/add-patient-ext",
      transcriptionStatus: "/api/v1/transcription-status/:sessionId",
      audioChunks: "/api/v1/session/:sessionId/chunks"
    },
    documentation: "https://github.com/Priyanshg0211/Medinote-backend",
    deployment: "Docker + Railway",
    storage: "Supabase Storage + Firebase Firestore",
    authentication: "None (Simplified for Assignment)"
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MediNote Backend API',
    version: '1.0.0',
    status: 'running',
    description: 'Medical transcription app backend for Attack Capital assignment',
    endpoints: {
      health: '/health',
      debug: '/debug/sessions',
      api: '/api/v1',
      patients: '/api/v1/patients',
      sessions: '/api/v1/upload-session',
      templates: '/api/v1/fetch-default-template-ext',
      presignedUrl: '/api/v1/get-presigned-url',
      chunkNotify: '/api/v1/notify-chunk-uploaded',
      addPatientExt: '/api/v1/patients/add-patient-ext',
      transcriptionStatus: '/api/v1/transcription-status/:sessionId',
      audioChunks: '/api/v1/session/:sessionId/chunks'
    },
    documentation: 'https://github.com/Priyanshg0211/Medinote-backend',
    deployment: 'Docker + Railway',
    storage: 'Supabase Storage + Firebase Firestore',
    authentication: 'None (Simplified for Assignment)'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /debug/sessions',
      'GET /api/v1/patients',
      'POST /api/v1/patients/add-patient-ext',
      'GET /api/v1/patients/:id',
      'PUT /api/v1/patients/:id',
      'DELETE /api/v1/patients/:id',
      'GET /api/v1/patients/:id/sessions',
      'GET /api/v1/all-session',
      'POST /api/v1/upload-session',
      'GET /api/v1/session/:id',
      'PUT /api/v1/session/:id',
      'DELETE /api/v1/session/:id',
      'GET /api/v1/session/:id/chunks',
      'POST /api/v1/get-presigned-url',
      'POST /api/v1/notify-chunk-uploaded',
      'GET /api/v1/transcription-status/:sessionId',
      'POST /api/v1/retry-transcription/:sessionId',
      'GET /api/users/asd3fd2faec',
      'POST /api/users',
      'GET /api/users/profile',
      'PUT /api/users/profile',
      'DELETE /api/users/profile',
      'GET /api/users/stats',
      'GET /api/v1/fetch-default-template-ext',
      'POST /api/v1/templates',
      'GET /api/v1/templates/:id',
      'PUT /api/v1/templates/:id',
      'DELETE /api/v1/templates/:id'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 MediNote Backend Server Started');
  console.log(`📍 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🐛 Debug endpoint: http://localhost:${PORT}/debug/sessions`);
  console.log('\n📋 Available API Endpoints:');
  console.log('   Patient Management:');
  console.log('     GET  /api/v1/patients');
  console.log('     POST /api/v1/patients/add-patient-ext');
  console.log('     GET  /api/v1/patients/:id');
  console.log('     PUT  /api/v1/patients/:id');
  console.log('     DELETE /api/v1/patients/:id');
  console.log('     GET  /api/v1/patients/:id/sessions');
  console.log('   Session Management:');
  console.log('     GET  /api/v1/all-session');
  console.log('     POST /api/v1/upload-session');
  console.log('     GET  /api/v1/session/:id');
  console.log('     PUT  /api/v1/session/:id');
  console.log('     DELETE /api/v1/session/:id');
  console.log('     GET  /api/v1/session/:id/chunks');
  console.log('   Audio Management:');
  console.log('     POST /api/v1/get-presigned-url');
  console.log('     POST /api/v1/notify-chunk-uploaded');
  console.log('     GET  /api/v1/transcription-status/:sessionId');
  console.log('     POST /api/v1/retry-transcription/:sessionId');
  console.log('   User Management:');
  console.log('     GET  /api/users/asd3fd2faec');
  console.log('     POST /api/users');
  console.log('     GET  /api/users/profile');
  console.log('     PUT  /api/users/profile');
  console.log('     DELETE /api/users/profile');
  console.log('     GET  /api/users/stats');
  console.log('   Template Management:');
  console.log('     GET  /api/v1/fetch-default-template-ext');
  console.log('     POST /api/v1/templates');
  console.log('     GET  /api/v1/templates/:id');
  console.log('     PUT  /api/v1/templates/:id');
  console.log('     DELETE /api/v1/templates/:id');
  console.log('   Collections:');
  console.log('     GET  /api/v1/collections');
  console.log('\n💾 Storage: Supabase Storage + Firebase Firestore');
  console.log('🔐 Authentication: None (Simplified for Assignment)');
  console.log('💡 Ready for Flutter app connections!');
});
