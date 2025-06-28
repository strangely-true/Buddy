import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store active sessions
const sessions = new Map();

// AI Agents configuration
const agents = [
  {
    id: 'chen',
    name: 'Dr. Sarah Chen',
    role: 'Research Analyst',
    personality: 'analytical, methodical, data-driven',
    expertise: 'research methodology, data analysis, scientific approach',
    voiceId: 'EXAVITQu4vr4xnSDxMaL' // Bella voice
  },
  {
    id: 'thompson',
    name: 'Marcus Thompson',
    role: 'Strategy Expert',
    personality: 'strategic, decisive, business-focused',
    expertise: 'business strategy, market analysis, competitive intelligence',
    voiceId: 'pNInz6obpgDQGcFmaJgB' // Adam voice
  },
  {
    id: 'rodriguez',
    name: 'Prof. Elena Rodriguez',
    role: 'Domain Specialist',
    personality: 'academic, thorough, theoretical',
    expertise: 'theoretical frameworks, academic research, conceptual analysis',
    voiceId: 'XB0fDUnXU5powFXDhCwa' // Charlotte voice
  },
  {
    id: 'kim',
    name: 'Alex Kim',
    role: 'Innovation Lead',
    personality: 'creative, forward-thinking, disruptive',
    expertise: 'innovation, emerging technologies, future trends',
    voiceId: 'onwK4e9ZLuTAKqWW03F9' // Daniel voice
  }
];

// Generate AI response
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null) {
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) throw new Error('Agent not found');

  const conversationContext = conversationHistory.slice(-10).join('\n');
  
  const prompt = `You are ${agent.name}, a ${agent.role} with expertise in ${agent.expertise}. 
Your personality is ${agent.personality}.

Current discussion topic: ${context}

Recent conversation:
${conversationContext}

${userInput ? `A user just said: "${userInput}"` : 'Continue the discussion naturally, building on previous points or introducing new perspectives.'}

Respond as ${agent.name} would, staying in character. Keep responses conversational, insightful, and around 2-3 sentences. Make it engaging and natural.

Response:`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
}

// Generate speech using ElevenLabs
async function generateSpeech(text, voiceId, elevenLabsApiKey) {
  if (!elevenLabsApiKey) {
    return null; // Return null if no API key
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    return null;
  }
}

// Process content and start conversation
app.post('/api/process-content', async (req, res) => {
  try {
    const { content, type, sessionId, geminiApiKey } = req.body;
    
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key required' });
    }

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

    const analysisPrompt = `Analyze the following ${type} content and extract key themes, topics, and discussion points that would be suitable for an AI conference discussion:

${content}

Provide a structured analysis with:
1. Main topics (3-5 key themes)
2. Discussion angles (different perspectives to explore)
3. Potential questions or debates
4. Areas of interest for each type of expert (research, strategy, academic, innovation)

Keep the analysis concise but comprehensive.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: analysisPrompt,
    });

    const analysis = response.text;

    // Store session data
    sessions.set(sessionId, {
      topic: analysis,
      conversationHistory: [],
      participants: agents,
      isActive: true
    });

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Content processing error:', error);
    res.status(500).json({ error: 'Failed to process content' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  socket.on('start-conversation', async (data) => {
    const { sessionId, geminiApiKey, elevenLabsApiKey } = data;
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }

    try {
      // Generate opening statement from Dr. Chen
      const openingAgent = agents[0]; // Dr. Chen
      const openingPrompt = `Based on this topic analysis: ${session.topic}

Generate an opening statement that Dr. Sarah Chen (Research Analyst) would make to start a conference discussion. Keep it engaging, professional, and around 2-3 sentences.`;

      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: openingPrompt,
      });

      const message = response.text;
      session.conversationHistory.push(`${openingAgent.name}: ${message}`);

      // Generate speech
      const audioBase64 = await generateSpeech(message, openingAgent.voiceId, elevenLabsApiKey);

      // Emit to all users in the session
      io.to(sessionId).emit('agent-message', {
        agentId: openingAgent.id,
        agentName: openingAgent.name,
        message,
        audio: audioBase64,
        timestamp: new Date()
      });

      // Start conversation loop
      startConversationLoop(sessionId, geminiApiKey, elevenLabsApiKey);

    } catch (error) {
      console.error('Conversation start error:', error);
      socket.emit('error', 'Failed to start conversation');
    }
  });

  socket.on('user-message', async (data) => {
    const { sessionId, message, geminiApiKey, elevenLabsApiKey } = data;
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }

    try {
      // Add user message to history
      session.conversationHistory.push(`User: ${message}`);

      // Emit user message to all participants
      io.to(sessionId).emit('user-message', {
        message,
        timestamp: new Date()
      });

      // Generate response from a random agent
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const response = await generateAgentResponse(
        geminiApiKey,
        randomAgent.id,
        session.topic,
        session.conversationHistory,
        message
      );

      session.conversationHistory.push(`${randomAgent.name}: ${response}`);

      // Generate speech
      const audioBase64 = await generateSpeech(response, randomAgent.voiceId, elevenLabsApiKey);

      // Emit agent response
      io.to(sessionId).emit('agent-message', {
        agentId: randomAgent.id,
        agentName: randomAgent.name,
        message: response,
        audio: audioBase64,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('User message error:', error);
      socket.emit('error', 'Failed to process message');
    }
  });

  socket.on('end-session', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      sessions.delete(sessionId);
    }
    io.to(sessionId).emit('session-ended');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Conversation loop function
async function startConversationLoop(sessionId, geminiApiKey, elevenLabsApiKey) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive) return;

  const interval = setInterval(async () => {
    if (!session.isActive) {
      clearInterval(interval);
      return;
    }

    try {
      // Select next agent (avoid same agent speaking twice in a row)
      const lastSpeaker = session.conversationHistory[session.conversationHistory.length - 1]?.split(':')[0];
      const availableAgents = agents.filter(agent => agent.name !== lastSpeaker);
      const nextAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];

      const response = await generateAgentResponse(
        geminiApiKey,
        nextAgent.id,
        session.topic,
        session.conversationHistory
      );

      session.conversationHistory.push(`${nextAgent.name}: ${response}`);

      // Generate speech
      const audioBase64 = await generateSpeech(response, nextAgent.voiceId, elevenLabsApiKey);

      // Emit to all users in the session
      io.to(sessionId).emit('agent-message', {
        agentId: nextAgent.id,
        agentName: nextAgent.name,
        message: response,
        audio: audioBase64,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Conversation loop error:', error);
    }
  }, 8000); // Agent speaks every 8 seconds
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});