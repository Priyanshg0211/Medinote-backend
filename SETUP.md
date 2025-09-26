# MediNote Backend Setup Guide

## Overview
This backend implementation uses a simplified hybrid approach:
- **Supabase Storage**: For audio file storage (free tier available)
- **Firebase Firestore**: For database operations (metadata, sessions, patients, etc.)
- **No Authentication**: Simplified for assignment purposes

## Prerequisites
- Node.js 16+ installed
- Supabase account and project
- Firebase project with Firestore enabled

## Environment Variables
Create a `.env` file in the root directory with the following variables:

```bash
# Supabase Configuration (for audio storage)
SUPABASE_URL=https://jjoqsxxwsltnwlllbgqd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3FzeHh3c2x0bndsbGxiZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDc0NDYsImV4cCI6MjA3NDQ4MzQ0Nn0.uAP4M5OKOzT2VK2KmJAR6VFOjB0vLfdIqprNijavrUg
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Firebase Configuration (for database only)
FIREBASE_PROJECT_ID=medinote-6b0b6

# Server Configuration
PORT=3000
NODE_ENV=development

# Storage Configuration
STORAGE_BUCKET_NAME=medinote-audio-files
```

## Database Setup

### 1. Create Supabase Storage Bucket
In Supabase dashboard, go to Storage and create a new bucket:
- Name: `medinote-audio-files`
- Public: Yes

### 2. Firebase Firestore Collections
The following collections will be created automatically when data is added:
- `patients` - Patient information (name, userId)
- `sessions` - Recording sessions (patientId, userId, patientName, status, startTime, chunksUploaded, totalChunks)
- `audio_chunks` - Audio chunk metadata (sessionId, chunkNumber, gcsPath, publicUrl, mimeType, isLast, uploadedAt)
- `templates` - Medical templates (title, userId)
- `users` - User profiles (email, name)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

## API Endpoints

### Authentication
No authentication required for this simplified assignment version.

### Core Endpoints

#### Audio Upload Flow
1. **Get Presigned URL**
   ```
   POST /api/v1/get-presigned-url
   Body: { sessionId, chunkNumber, mimeType }
   ```

2. **Upload Audio Chunk**
   ```
   PUT <presigned-url>
   Body: <audio-file-binary>
   ```

3. **Notify Chunk Uploaded**
   ```
   POST /api/v1/notify-chunk-uploaded
   Body: { sessionId, gcsPath, chunkNumber, isLast, ... }
   ```

#### Patient Management
- `GET /api/v1/patients?userId=<uid>` - Get all patients for user
- `POST /api/v1/patients/add-patient-ext` - Create new patient
- `GET /api/v1/patients/:id` - Get patient details
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient

#### Session Management
- `POST /api/v1/upload-session` - Create new session
- `GET /api/v1/all-session?userId=<uid>` - Get all sessions for user
- `GET /api/v1/session/:id` - Get session details
- `PUT /api/v1/session/:id` - Update session
- `DELETE /api/v1/session/:id` - Delete session

#### Transcription
- `GET /api/v1/transcription-status/:sessionId` - Get transcription status
- `POST /api/v1/retry-transcription/:sessionId` - Retry failed transcription

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Audio Upload (without authentication)
```bash
# Get presigned URL
curl -X POST http://localhost:3000/api/v1/get-presigned-url \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test123","chunkNumber":1,"mimeType":"audio/wav"}'

# Notify chunk uploaded
curl -X POST http://localhost:3000/api/v1/notify-chunk-uploaded \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test123","gcsPath":"sessions/test123/chunk_1.wav","chunkNumber":1,"isLast":false}'
```

## Features

### ✅ Implemented
- Hybrid storage: Supabase for audio files, Firebase for metadata
- Firebase authentication
- Audio chunk upload with presigned URLs
- Patient management
- Session management
- Template management
- User management
- Error handling and logging

### 🔄 Simplified for Assignment
- No transcription service (focus on audio upload)
- Direct audio chunk storage and retrieval

### 🚀 Ready for Production
- Docker support
- Railway deployment ready
- Comprehensive error handling
- Security best practices
- Scalable architecture

## Architecture

### Hybrid Storage Approach
- **Supabase Storage**: Stores actual audio files (chunks)
- **Firebase Firestore**: Stores metadata, URLs, and relationships
- **No Authentication**: Simplified for assignment

### Data Flow
1. Client requests presigned URL from Supabase
2. Client uploads audio chunk directly to Supabase
3. Client notifies backend with chunk metadata
4. Backend stores metadata and Supabase URL in Firebase
5. Backend tracks session progress and completion

## Next Steps

1. **Production Deployment**
   - Set up proper environment variables
   - Configure Firebase service account
   - Set up Supabase service role key
   - Deploy to Railway or similar platform

2. **Optional Enhancements**
   - Add transcription service later
   - Implement audio chunk combination
   - Add real-time notifications

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Check SUPABASE_URL and SUPABASE_ANON_KEY
   - Verify Supabase project is active
   - Ensure storage bucket exists

2. **Firebase Connection Error**
   - Check Firebase project configuration
   - Verify Firestore is enabled

3. **Storage Upload Error**
   - Ensure Supabase storage bucket exists
   - Check bucket permissions
   - Verify presigned URL generation

4. **Database Query Error**
   - Check Firebase Firestore rules
   - Verify collection names

### Debug Endpoints
- `GET /debug/sessions` - View all data
- `GET /health` - Server status
- `GET /api/v1/collections` - Database collections

## Support
For issues and questions, refer to the project documentation or create an issue in the repository.
