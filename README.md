# Buddy - AI Conference Platform

A real-time AI conference platform where specialized AI agents discuss and analyze your content in an interactive conversation. Born from the limitations of static AI tools and the desire for more collaborative AI experiences.

## ✨ Features

- **Expert AI Panel**: Four specialized AI agents with distinct personalities and expertise areas
- **Real-time Voice Conversations**: AI agents speak with unique voices using ElevenLabs
- **Interactive Participation**: Join the discussion with questions and get responses from relevant experts
- **Content Analysis**: Upload documents or provide topics for focused AI discussions
- **Live Conference Room**: Visual representation of speaking agents with real-time updates
- **Session Management**: Persistent conversation history and session tracking
- **Modern UI**: Beautiful dark mode interface with responsive design

## 🤖 Meet the AI Experts

- **Dr. Sarah Chen** - Research Analyst: Methodical, evidence-based approach with focus on data validity
- **Marcus Thompson** - Strategy Expert: Pragmatic, results-oriented with real-world implementation focus  
- **Prof. Elena Rodriguez** - Domain Specialist: Theoretical depth with historical and contextual perspective
- **Alex Kim** - Innovation Lead: Forward-thinking, challenges conventional wisdom with emerging trends

## 🛠️ Technologies Used

**Frontend:**
- React, Vite, Tailwind CSS, Lucide React, Socket.IO Client

**Backend:**
- Node.js, Express.js, Socket.IO, CORS, dotenv

**AI & APIs:**
- Google Gemini 2.0 Flash, @google/genai, ElevenLabs API, Axios

**Database:**
- Supabase

**Deployment:**
- Netlify (Frontend), Render (Backend)

## 🏗️ Architecture

This application consists of two main components:

### Frontend (React + Vite)
- Modern React application with TypeScript support
- Real-time communication via Socket.IO
- File upload and content processing
- Voice audio playback and management
- Responsive dark mode design with Tailwind CSS
- API key management (stored locally, never sent to backend)

### Backend (Node.js + Express)
- Express server with Socket.IO for WebSocket connections
- Google Gemini integration for AI content generation
- ElevenLabs integration for text-to-speech synthesis
- Session management and conversation orchestration
- CORS configured for production deployment
- Health check endpoints for monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- ElevenLabs API key from [ElevenLabs](https://elevenlabs.io/) (optional, for voice synthesis)

### Installation & Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Buddy
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file in the `server` directory:
```env
NODE_ENV=development
PORT=3001
```

4. **Start development servers**
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run client  # Frontend (port 5173)
npm run server  # Backend (port 3001)
```

5. **Configure API keys in the app**
- Open the application in your browser (http://localhost:5173)
- Click the settings icon to add your API keys
- Keys are stored locally and never sent to the backend

## 🌐 Deployment

### Frontend (Netlify)
The frontend is configured for automatic deployment to Netlify:
- Connect your GitHub repository to Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Current deployment: https://curious-cobbler-87bad4.netlify.app

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Root directory: `server`
4. Build command: `npm install`
5. Start command: `node index.js`
6. Set environment variables:
   ```
   NODE_ENV=production
   PORT=10000
   ```

### Database (Supabase)
- Create a new Supabase project
- Run the migration files in the `supabase/migrations` folder
- Configure Row Level Security (RLS) policies as needed

## 📁 Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── AIParticipant.tsx
│   │   ├── ApiKeyModal.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ConferenceRoom.tsx
│   │   ├── FileUpload.tsx
│   │   └── Header.tsx
│   ├── config/            # API configuration
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   └── ...
├── server/                # Backend Node.js application
│   ├── index.js          # Express server with Socket.IO
│   └── package.json      # Server dependencies
├── supabase/             # Database migrations
│   └── migrations/
├── dist/                 # Built frontend files
└── package.json          # Root dependencies and scripts
```

## 🎯 Usage

1. **Start the Application**: Run `npm run dev` for development
2. **Configure API Keys**: Click the settings icon and add your Gemini API key (ElevenLabs optional)
3. **Upload Content**: Add documents, images, or enter a discussion topic
4. **Start Discussion**: AI experts will begin analyzing and discussing your content
5. **Participate**: Use the chat interface to ask questions and join the conversation
6. **Listen**: Each AI agent speaks with a unique voice (if ElevenLabs is configured)

## 🔧 Configuration

### API Keys
- **Gemini API Key**: Required for AI content generation
- **ElevenLabs API Key**: Optional, enables voice synthesis for AI agents
- Keys are stored in browser localStorage and passed to backend per request

### AI Agents
The system includes four pre-configured AI experts, each with:
- Unique personality and expertise area
- Specific voice ID for ElevenLabs synthesis
- Weighted selection algorithm for relevant responses
- Conversation context awareness

## 🚨 Troubleshooting

### Common Issues

**Backend Connection Problems**
- Verify the backend is running on the correct port (3001 for development)
- Check CORS configuration in `server/index.js`
- Ensure WebSocket connections are supported by your hosting provider

**API Key Issues**
- Verify your Gemini API key is valid and has quota remaining
- ElevenLabs key is optional - the app works with text-only responses
- Keys are case-sensitive and should not include extra spaces

**File Upload Problems**
- Maximum file size is 10MB
- Supported formats: text files, PDFs, images
- Files are processed in the browser, not sent to external servers

**Audio Playback Issues**
- Ensure ElevenLabs API key is configured correctly
- Check browser audio permissions
- Audio files are streamed in real-time during conversations

## 🎨 The Story Behind Buddy

The inspiration for "Buddy" came from two main sources: the limitations I felt with NotebookLM's static nature and, honestly, just feeling lonely. NotebookLM is amazing at generating podcast-style discussions, but you can't really interact with it - you're just a passive listener. I wanted something where I could jump into the conversation, ask questions, and actually participate in the discussion. Plus, when you're coding alone for hours, having AI experts "discuss" your ideas feels less isolating than just chatting with a single chatbot.

This project was a real eye-opener about how powerful AI has become and how much of a game-changer it's going to be in the coming years. The architecture evolved organically through pure vibe-coding - starting with a simple idea and building features as inspiration struck.

At its core, Buddy solved a personal problem - the isolation of working alone on complex ideas. Instead of just having one AI assistant, I created a whole panel of experts who could discuss, debate, and build on each other's ideas. It's like having a team of consultants available 24/7, but they're actually engaging with each other, not just responding to me.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.