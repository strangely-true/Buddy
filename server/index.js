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

// AI Agents configuration with unique voices
const agents = [
  {
    id: 'chen',
    name: 'Dr. Sarah Chen',
    role: 'Research Analyst',
    personality: 'analytical, methodical, data-driven',
    expertise: 'research methodology, data analysis, scientific approach',
    voiceId: 'EXAVITQu4vr4xnSDxMaL' // Bella - professional female voice
  },
  {
    id: 'thompson',
    name: 'Marcus Thompson',
    role: 'Strategy Expert',
    personality: 'strategic, decisive, business-focused',
    expertise: 'business strategy, market analysis, competitive intelligence',
    voiceId: 'pNInz6obpgDQGcFmaJgB' // Adam - confident male voice
  },
  {
    id: 'rodriguez',
    name: 'Prof. Elena Rodriguez',
    role: 'Domain Specialist',
    personality: 'academic, thorough, theoretical',
    expertise: 'theoretical frameworks, academic research, conceptual analysis',
    voiceId: 'XB0fDUnXU5powFXDhCwa' // Charlotte - academic female voice
  },
  {
    id: 'kim',
    name: 'Alex Kim',
    role: 'Innovation Lead',
    personality: 'creative, forward-thinking, disruptive',
    expertise: 'innovation, emerging technologies, future trends',
    voiceId: 'onwK4e9ZLuTAKqWW03F9' // Daniel - energetic male voice
  }
];

// Generate AI response
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null) {
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) throw new Error('Agent not found');

  const conversationContext = conversationHistory.slice(-8).join('\n');
  
  const prompt = `You are ${agent.name}, a ${agent.role} with expertise in ${agent.expertise}. 
Your personality is ${agent.personality}.

Current discussion topic: ${context}

Recent conversation:
${conversationContext}

${userInput ? `A user just said: "${userInput}"` : 'Continue the discussion naturally, building on previous points or introducing new perspectives related to your expertise.'}

Respond as ${agent.name} would, staying in character. Keep responses conversational, insightful, and 2-4 sentences. Make it engaging and natural. Build meaningfully on what others have said.

Response:`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
}

// Generate speech using ElevenLabs with better error handling
async function generateSpeech(text, voiceId, elevenLabsApiKey) {
  // Return null if no API key is provided
  if (!elevenLabsApiKey || elevenLabsApiKey.trim() === '') {
    console.log('ElevenLabs API key not provided, skipping speech generation');
    return null;
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error('ElevenLabs API error:', error.response?.status, error.response?.statusText);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      console.error('ElevenLabs API authentication failed. Please check your API key.');
    } else if (error.response?.status === 429) {
      console.error('ElevenLabs API rate limit exceeded.');
    } else if (error.response?.status === 400) {
      console.error('ElevenLabs API bad request. Check your request parameters.');
    }
    
    return null;
  }
}

// Calculate estimated audio duration (rough estimate: ~150 words per minute)
function estimateAudioDuration(text) {
  const words = text.split(' ').length;
  const wordsPerMinute = 150;
  const durationSeconds = (words / wordsPerMinute) * 60;
  return Math.max(durationSeconds * 1000, 3000); // Minimum 3 seconds
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
      isActive: true,
      currentSpeaker: null,
      conversationQueue: [],
      totalMessages: 0,
      maxMessages: 20 // Limit for 5-15 minute conversation
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

Generate an engaging opening statement that Dr. Sarah Chen (Research Analyst) would make to start a conference discussion. Keep it professional, insightful, and around 3-4 sentences. Set the stage for a meaningful discussion.`;

      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: openingPrompt,
      });

      const message = response.text;
      session.conversationHistory.push(`${openingAgent.name}: ${message}`);
      session.currentSpeaker = openingAgent.id;
      session.totalMessages++;

      // Generate speech (will return null if no API key)
      const audioBase64 = await generateSpeech(message, openingAgent.voiceId, elevenLabsApiKey);
      const audioDuration = estimateAudioDuration(message);

      // Emit to all users in the session
      io.to(sessionId).emit('agent-message', {
        agentId: openingAgent.id,
        agentName: openingAgent.name,
        message,
        audio: audioBase64,
        audioDuration,
        timestamp: new Date()
      });

      // Start the synchronized conversation loop
      setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000); // Wait for audio to finish + 2 second pause

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

      // Wait a moment then have an agent respond
      setTimeout(async () => {
        await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, message);
      }, 1500);

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

// Synchronized conversation function
async function startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.totalMessages >= session.maxMessages) {
    return;
  }

  try {
    await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey);
  } catch (error) {
    console.error('Synchronized conversation error:', error);
  }
}

// Generate next agent response with proper synchronization
async function generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, userInput = null) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.totalMessages >= session.maxMessages) {
    return;
  }

  try {
    // Select next agent (avoid same agent speaking twice in a row)
    const lastSpeaker = session.currentSpeaker;
    const availableAgents = agents.filter(agent => agent.id !== lastSpeaker);
    const nextAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];

    const response = await generateAgentResponse(
      geminiApiKey,
      nextAgent.id,
      session.topic,
      session.conversationHistory,
      userInput
    );

    session.conversationHistory.push(`${nextAgent.name}: ${response}`);
    session.currentSpeaker = nextAgent.id;
    session.totalMessages++;

    // Generate speech
    const audioBase64 = await generateSpeech(response, nextAgent.voiceId, elevenLabsApiKey);
    const audioDuration = estimateAudioDuration(response);

    // Emit to all users in the session
    io.to(sessionId).emit('agent-message', {
      agentId: nextAgent.id,
      agentName: nextAgent.name,
      message: response,
      audio: audioBase64,
      audioDuration,
      timestamp: new Date()
    });

    // Schedule next response after current audio finishes
    if (session.totalMessages < session.maxMessages) {
      setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 3000); // Wait for audio + 3 second pause between speakers
    } else {
      // End conversation
      setTimeout(() => {
        io.to(sessionId).emit('conversation-ended', {
          message: 'The AI conference discussion has concluded. Thank you for participating!'
        });
      }, audioDuration + 2000);
    }

  } catch (error) {
    console.error('Next agent response error:', error);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});