# MediNote Backend API

A Node.js backend API for the MediNote medical transcription mobile application, designed for Attack Capital's mobile engineering challenge.

## Features

- **Patient Management**: CRUD operations for patient records
- **Session Management**: Recording session lifecycle management
- **Template Management**: User-specific template configuration
- **Audio Processing**: Mock Google Cloud Storage integration for audio chunks
- **Real-time Streaming**: Chunked audio upload with presigned URLs

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (optional)

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Server will be available at http://localhost:3000
```

### Docker Deployment

```bash
# One-command deployment
docker-compose up

# Or build and run manually
docker build -t medinote-backend .
docker run -p 3000:3000 medinote-backend
```

## API Endpoints

### Patient Management
- `GET /api/v1/patients?userId={userId}` - Get all patients for a user
- `POST /api/v1/add-patient-ext` - Create a new patient
- `GET /api/v1/patient-details/{patientId}` - Get patient details
- `GET /api/v1/fetch-session-by-patient/{patientId}` - Get patient sessions
- `GET /api/v1/all-session?userId={userId}` - Get all user sessions

### Recording Management
- `POST /api/v1/upload-session` - Start a recording session
- `POST /api/v1/get-presigned-url` - Get presigned URL for audio upload
- `PUT {presignedUrl}` - Upload audio chunk directly to GCS
- `POST /api/v1/notify-chunk-uploaded` - Notify chunk upload completion

### Template Management
- `GET /api/v1/fetch-default-template-ext?userId={userId}` - Get user templates

### User Management
- `GET /api/users/asd3fd2faec?email={email}` - Get user ID by email

## Health Check

- **Health Check**: `GET /health`
- **Debug Endpoint**: `GET /debug/sessions`

## Assignment Compliance

This backend is specifically designed for Attack Capital's mobile engineering challenge:

- ✅ **Minimal Response Payloads**: Returns only essential IDs
- ✅ **Real-time Audio Streaming**: Chunked upload with presigned URLs
- ✅ **Session Management**: Complete recording session lifecycle
- ✅ **Docker Support**: One-command deployment with `docker-compose up`
- ✅ **Health Checks**: Built-in health monitoring
- ✅ **API Documentation**: Complete Postman collection included

## License

MIT License - Built for Attack Capital Mobile Engineering Challenge
