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

// In-memory storage for demo
let sessions = {};
let patients = [
  { id: "patient_123", name: "John Doe" },
  { id: "patient_456", name: "Jane Smith" },
  { id: "patient_789", name: "Bob Wilson" }
];
let users = [
  { id: "user_123", email: "doctor@hospital.com" }
];

// Patient Management Endpoints
app.get('/api/v1/patients', (req, res) => {
  const { userId } = req.query;
  console.log('GET /patients - userId:', userId);

  res.json({
    patients: patients
  });
});

app.post('/api/v1/add-patient-ext', (req, res) => {
  const { name, userId } = req.body;
  const newPatient = {
    id: `patient_${Date.now()}`,
    name: name,
    user_id: userId,
    pronouns: null
  };

  patients.push({
    id: newPatient.id,
    name: newPatient.name
  });

  console.log('POST /add-patient-ext - Created:', newPatient);

  res.status(201).json({
    patient: newPatient
  });
});

app.get('/api/v1/patient-details/:patientId', (req, res) => {
  const { patientId } = req.params;
  console.log('GET /patient-details - patientId:', patientId);

  res.json({
    id: patientId,
    name: "John Doe",
    pronouns: "he/him",
    email: "john@example.com",
    background: "Patient background information",
    medical_history: "Previous medical conditions",
    family_history: "Family medical history",
    social_history: "Social history information",
    previous_treatment: "Previous treatments"
  });
});

app.get('/api/v1/fetch-session-by-patient/:patientId', (req, res) => {
  const { patientId } = req.params;
  console.log('GET /fetch-session-by-patient - patientId:', patientId);

  const patientSessions = Object.values(sessions).filter(s => s.patientId === patientId);

  res.json({
    sessions: patientSessions.map(session => ({
      id: session.id,
      date: session.startTime.split('T')[0],
      session_title: "Initial Consultation",
      session_summary: "Patient consultation summary",
      start_time: session.startTime
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
      session_title: "Initial Consultation",
      session_summary: "Patient consultation summary",
      transcript_status: "completed",
      transcript: "Full transcript text...",
      status: session.status,
      date: session.startTime.split('T')[0],
      start_time: session.startTime,
      end_time: new Date(Date.now() + 30*60000).toISOString(),
      patient_name: session.patientName,
      pronouns: "he/him",
      email: "john@example.com",
      background: "Patient background",
      duration: "30 minutes",
      medical_history: "Previous conditions",
      family_history: "Family history",
      social_history: "Social history",
      previous_treatment: "Previous treatments",
      patient_pronouns: "he/him",
      clinical_notes: []
    })),
    patientMap: patients.reduce((acc, patient) => {
      acc[patient.id] = {
        name: patient.name,
        pronouns: "he/him"
      };
      return acc;
    }, {})
  });
});

// Recording Session Management
app.post('/api/v1/upload-session', (req, res) => {
  const { patientId, userId, patientName, status, startTime, templateId } = req.body;

  const sessionId = `session_${Date.now()}`;
  sessions[sessionId] = {
    id: sessionId,
    patientId,
    userId,
    patientName,
    status,
    startTime,
    templateId,
    chunks: []
  };

  console.log('POST /upload-session - Created session:', sessionId);

  res.status(201).json({
    id: sessionId
  });
});

app.post('/api/v1/get-presigned-url', (req, res) => {
  const { sessionId, chunkNumber, mimeType } = req.body;

  const mockPresignedUrl = `http://localhost:3000/mock-gcs-upload/${sessionId}/${chunkNumber}`;
  const gcsPath = `sessions/${sessionId}/chunk_${chunkNumber}.wav`;
  const publicUrl = `http://localhost:3000/audio/${sessionId}/${chunkNumber}`;

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
    res.json({ id: user.id });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Template Management
app.get('/api/v1/fetch-default-template-ext', (req, res) => {
  const { userId } = req.query;
  console.log('GET /fetch-default-template-ext - userId:', userId);

  res.json({
    success: true,
    data: [
      {
        id: "template_123",
        title: "New Patient Visit",
        type: "default"
      },
      {
        id: "template_456",
        title: "Follow-up Visit",
        type: "predefined"
      }
    ]
  });
});

// Debug and Health Check
app.get('/debug/sessions', (req, res) => {
  res.json({
    sessions: sessions,
    totalSessions: Object.keys(sessions).length,
    patients: patients,
    users: users
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
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
  console.log('   Template Management:');
  console.log('     GET  /api/v1/fetch-default-template-ext');
  console.log('\n💡 Ready for Flutter app connections!');
});
