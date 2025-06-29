# Buddy - AI Conference Platform

A modern AI-powered conference platform where expert AI agents discuss and analyze your content in real-time.

## 🚀 Features

- **AI Expert Panel**: Four specialized AI agents with distinct personalities and expertise
- **File Upload**: Support for documents and images with multimodal AI analysis
- **Real-time Discussion**: Live AI conversations with voice synthesis
- **Interactive Chat**: Join the discussion with questions and clarifications
- **Customizable Personalities**: Configure AI agent behaviors and expertise
- **Dark Mode Design**: Modern, sleek interface with beautiful animations

## 🏗️ Architecture

This application consists of two parts:

### Frontend (React + Vite)
- Modern React application with TypeScript
- Real-time communication via Socket.IO
- File upload and processing
- Voice synthesis integration
- Responsive dark mode design

### Backend (Node.js + Express)
- Express server with Socket.IO for real-time communication
- Google Gemini AI integration for content analysis
- ElevenLabs integration for voice synthesis
- Session management and conversation handling

## 🚀 Deployment Guide

### 1. Deploy the Backend

The backend needs to be deployed to a service that supports Node.js and WebSocket connections:

#### Option A: Heroku
```bash
# In the project root
git init
git add .
git commit -m "Initial commit"

# Create Heroku app
heroku create your-app-name-backend

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### Option B: Railway
1. Connect your GitHub repository to Railway
2. Select the root directory for deployment
3. Railway will automatically detect the Node.js app
4. Set environment variables in the Railway dashboard

#### Option C: Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm run server`
5. Add environment variables

### 2. Update Frontend Configuration

After deploying the backend, update the API configuration:

1. Open `src/config/api.ts`
2. Replace `'https://your-backend-url.herokuapp.com'` with your actual backend URL
3. Example:
```typescript
export const API_CONFIG = {
  BASE_URL: isDevelopment 
    ? 'http://localhost:3001' 
    : 'https://your-app-name-backend.herokuapp.com', // Your actual backend URL
  // ...
};
```

### 3. Deploy the Frontend

The frontend is automatically deployed to Netlify when you push changes. The current deployment is at:
https://curious-cobbler-87bad4.netlify.app

## 🔧 Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=3001
```

### Frontend
No environment variables needed - API keys are configured in the UI and stored locally.

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development (both frontend and backend)
npm run dev

# Or start individually:
npm run client  # Frontend only
npm run server  # Backend only
```

### API Keys Required
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **ElevenLabs API Key** (Optional): Get from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)

## 📁 Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── config/            # API configuration
│   └── ...
├── server/                # Backend Node.js application
│   └── index.js          # Express server with Socket.IO
├── dist/                 # Built frontend files
└── package.json          # Dependencies and scripts
```

## 🔌 API Endpoints

### Backend Endpoints
- `POST /api/process-content` - Process uploaded content and start AI analysis
- WebSocket connection for real-time AI conversation

### Frontend Configuration
- Automatically switches between localhost (development) and deployed backend (production)
- Graceful error handling for backend connectivity issues

## 🎯 Usage

1. **Configure API Keys**: Click the settings icon to add your Gemini API key
2. **Upload Content**: Add documents or images, or enter a discussion topic
3. **Start Discussion**: AI experts will analyze and discuss your content
4. **Interact**: Join the conversation through the chat interface
5. **Customize**: Configure AI personalities for different discussion styles

## 🚨 Troubleshooting

### Backend Connection Issues
- Ensure the backend is deployed and accessible
- Check the API_CONFIG.BASE_URL in `src/config/api.ts`
- Verify WebSocket connections are supported by your hosting provider

### API Key Issues
- Ensure Gemini API key is valid and has sufficient quota
- ElevenLabs key is optional - the app works without voice synthesis

### File Upload Issues
- Check file size limits (10MB max)
- Ensure file types are supported (text files and images)
- Files are processed locally if no API key is configured

## 📄 License

MIT License - see LICENSE file for details.