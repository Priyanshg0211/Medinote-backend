const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

// In-memory storage (dynamic, populated via API)
let sessions = {};
let patients = [];
let users = [];
let templates = [];

// Patient Management Endpoints
app.get('/api/v1/patients', (req, res) => {
  const { userId } = req.query;
  console.log('GET /patients - userId:', userId);

  const result = userId ? patients.filter(p => p.user_id === userId) : patients;
  res.json({
    patients: result
  });
});

app.post('/api/v1/add-patient-ext', (req, res) => {
  const { name, userId, pronouns, email, background, medical_history, family_history, social_history, previous_treatment } = req.body;
  if (!name || !userId) {
    return res.status(400).json({ error: 'name and userId are required' });
  }
  const newPatient = {
    id: `patient_${Date.now()}`,
    name: name,
    user_id: userId,
    pronouns: pronouns || null,
    email: email || null,
    background: background || null,
    medical_history: medical_history || null,
    family_history: family_history || null,
    social_history: social_history || null,
    previous_treatment: previous_treatment || null
  };

  patients.push(newPatient);

  console.log('POST /add-patient-ext - Created:', newPatient);

  res.status(201).json({
    patient: newPatient
  });
});

app.get('/api/v1/patient-details/:patientId', (req, res) => {
  const { patientId } = req.params;
  console.log('GET /patient-details - patientId:', patientId);

  const patient = patients.find(p => p.id === patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json(patient);
});

app.get('/api/v1/fetch-session-by-patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  console.log('GET /fetch-session-by-patient - patientId:', patientId);

  const patientSessions = Object.values(sessions).filter(s => s.patientId === patientId);

  res.json({
    sessions: patientSessions.map(session => ({
      id: session.id,
      date: session.startTime ? session.startTime.split('T')[0] : null,
      session_title: session.session_title || null,
      session_summary: session.session_summary || null,
      start_time: session.startTime || null,
      end_time: session.endTime || null,
      status: session.status || null
    }))
  });
});

app.get('/api/v1/all-session', (req, res) => {
  const { userId } = req.query;
  console.log('GET /all-session - userId:', userId);

  const userSessions = Object.values(sessions).filter(s => s.userId === userId);

  res.json({
    sessions: userSessions.map(session => ({
      id: session.id,
      user_id: session.userId,
      patient_id: session.patientId,
      session_title: session.session_title || null,
      session_summary: session.session_summary || null,
      transcript_status: session.transcript_status || null,
      transcript: session.transcript || null,
      status: session.status || null,
      date: session.startTime ? session.startTime.split('T')[0] : null,
      start_time: session.startTime || null,
      end_time: session.endTime || null,
      patient_name: session.patientName || null,
      pronouns: session.pronouns || null,
      email: session.email || null,
      background: session.background || null,
      duration: session.duration || null,
      medical_history: session.medical_history || null,
      family_history: session.family_history || null,
      social_history: session.social_history || null,
      previous_treatment: session.previous_treatment || null,
      patient_pronouns: session.patient_pronouns || null,
      clinical_notes: session.clinical_notes || []
    })),
    patientMap: patients.reduce((acc, patient) => {
      acc[patient.id] = {
        name: patient.name,
        pronouns: patient.pronouns || null
      };
      return acc;
    }, {})
  });
});

// Recording Session Management
app.post('/api/v1/upload-session', (req, res) => {
  const { patientId, userId, patientName, status, startTime, endTime, templateId, session_title, session_summary, transcript_status, transcript, duration } = req.body;
  if (!patientId || !userId) {
    return res.status(400).json({ error: 'patientId and userId are required' });
  }

  const sessionId = `session_${Date.now()}`;
  sessions[sessionId] = {
    id: sessionId,
    patientId,
    userId,
    patientName: patientName || null,
    status: status || 'in_progress',
    startTime: startTime || new Date().toISOString(),
    endTime: endTime || null,
    templateId: templateId || null,
    session_title: session_title || null,
    session_summary: session_summary || null,
    transcript_status: transcript_status || null,
    transcript: transcript || null,
    duration: duration || null,
    clinical_notes: [],
    chunks: []
  };

  console.log('POST /upload-session - Created session:', sessionId);

  res.status(201).json({ id: sessionId });
});

app.post('/api/v1/get-presigned-url', (req, res) => {
  const { sessionId, chunkNumber, mimeType } = req.body;
  if (!sessionId || typeof chunkNumber === 'undefined') {
    return res.status(400).json({ error: 'sessionId and chunkNumber are required' });
  }

  const mockPresignedUrl = `http://localhost:${PORT}/mock-gcs-upload/${sessionId}/${chunkNumber}`;
  const extension = mimeType && mimeType.includes('mp3') ? 'mp3' : 'wav';
  const gcsPath = `sessions/${sessionId}/chunk_${chunkNumber}.${extension}`;
  const publicUrl = `http://localhost:${PORT}/audio/${sessionId}/${chunkNumber}`;

  console.log('POST /get-presigned-url - Session:', sessionId, 'Chunk:', chunkNumber);

  res.json({
    url: mockPresignedUrl,
    gcsPath: gcsPath,
    publicUrl: publicUrl
  });
});

app.put('/mock-gcs-upload/:sessionId/:chunkNumber', (req, res) => {
  const { sessionId, chunkNumber } = req.params;

  console.log('PUT /mock-gcs-upload - Received chunk:', chunkNumber, 'for session:', sessionId);
  console.log('Chunk size:', req.headers['content-length'], 'bytes');

  res.status(200).send('');
});

app.post('/api/v1/notify-chunk-uploaded', (req, res) => {
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

  if (sessions[sessionId]) {
    sessions[sessionId].chunks.push({
      chunkNumber,
      gcsPath,
      publicUrl,
      mimeType,
      uploadedAt: new Date().toISOString()
    });

    console.log('POST /notify-chunk-uploaded - Session:', sessionId, 'Chunk:', chunkNumber);
    console.log('Is last chunk:', isLast, 'Total expected:', totalChunksClient);

    if (isLast) {
      sessions[sessionId].status = 'completed';
      sessions[sessionId].endTime = sessions[sessionId].endTime || new Date().toISOString();
      console.log('Session completed:', sessionId);
    }
  }

  res.json({});
});

// User Management
app.get('/api/users/asd3fd2faec', (req, res) => {
  const { email } = req.query;
  const user = users.find(u => u.email === email);
  if (user) {
    return res.json({ id: user.id, email: user.email, name: user.name || null });
  }
  return res.status(404).json({ error: 'User not found' });
});

app.post('/api/users', (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  const existing = users.find(u => u.email === email);
  if (existing) return res.status(200).json(existing);
  const user = { id: `user_${Date.now()}`, email, name: name || null };
  users.push(user);
  res.status(201).json(user);
});

// Template Management
app.get('/api/v1/fetch-default-template-ext', (req, res) => {
  const { userId } = req.query;
  console.log('GET /fetch-default-template-ext - userId:', userId);
  const data = userId ? templates.filter(t => t.user_id === userId) : templates;
  res.json({ success: true, data });
});

app.post('/api/v1/templates', (req, res) => {
  const { title, type, userId, content } = req.body;
  if (!title || !userId) return res.status(400).json({ error: 'title and userId are required' });
  const template = { id: `template_${Date.now()}`, title, type: type || 'custom', user_id: userId, content: content || null };
  templates.push(template);
  res.status(201).json(template);
});

app.put('/api/v1/templates/:id', (req, res) => {
  const { id } = req.params;
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  templates[idx] = { ...templates[idx], ...req.body };
  res.json(templates[idx]);
});

app.delete('/api/v1/templates/:id', (req, res) => {
  const { id } = req.params;
  const before = templates.length;
  templates = templates.filter(t => t.id !== id);
  if (templates.length === before) return res.status(404).json({ error: 'Template not found' });
  res.status(204).send('');
});

// Session details and chunks
app.get('/api/v1/session/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.get('/api/v1/session/:id/chunks', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ chunks: session.chunks });
});

// Collections overview for debugging/inspection
app.get('/api/v1/collections', (req, res) => {
  res.json({ users, patients, sessions, templates });
});

// Debug and Health Check
app.get('/debug/sessions', (req, res) => {
  res.json({
    sessions: sessions,
    totalSessions: Object.keys(sessions).length,
    patients: patients,
    users: users,
    templates: templates
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
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
      templates: '/api/v1/fetch-default-template-ext'
    },
    documentation: 'https://github.com/Priyanshg0211/Medinote-backend',
    deployment: 'Docker + Railway'
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
      'POST /api/v1/add-patient-ext',
      'GET /api/v1/patient-details/:id',
      'GET /api/v1/fetch-session-by-patient/:id',
      'GET /api/v1/all-session',
      'POST /api/v1/upload-session',
      'POST /api/v1/get-presigned-url',
      'POST /api/v1/notify-chunk-uploaded',
      'GET /api/users/asd3fd2faec',
      'POST /api/users',
      'GET /api/v1/fetch-default-template-ext'
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
  console.log('     POST /api/v1/add-patient-ext');
  console.log('     GET  /api/v1/patient-details/:id');
  console.log('     GET  /api/v1/fetch-session-by-patient/:id');
  console.log('     GET  /api/v1/all-session');
  console.log('   Recording Management:');
  console.log('     POST /api/v1/upload-session');
  console.log('     POST /api/v1/get-presigned-url');
  console.log('     POST /api/v1/notify-chunk-uploaded');
  console.log('   User Management:');
  console.log('     GET  /api/users/asd3fd2faec');
  console.log('     POST /api/users');
  console.log('   Template Management:');
  console.log('     GET  /api/v1/fetch-default-template-ext');
  console.log('     POST /api/v1/templates');
  console.log('     PUT  /api/v1/templates/:id');
  console.log('     DELETE /api/v1/templates/:id');
  console.log('   Collections:');
  console.log('     GET  /api/v1/collections');
  console.log('\n💡 Ready for Flutter app connections!');
});
