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

// AI Agents configuration with unique voices and distinct personalities
const agents = [
  {
    id: 'chen',
    name: 'Dr. Sarah Chen',
    role: 'Research Analyst',
    personality: 'methodical, evidence-based, asks probing questions about data validity and research methodology',
    expertise: 'research methodology, data analysis, statistical significance, peer review standards',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - professional female voice
    style: 'analytical and precise, focuses on empirical evidence and research rigor'
  },
  {
    id: 'thompson',
    name: 'Marcus Thompson',
    role: 'Strategy Expert',
    personality: 'pragmatic, results-oriented, challenges ideas with real-world implementation concerns',
    expertise: 'business strategy, market dynamics, competitive analysis, ROI assessment',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - confident male voice
    style: 'direct and business-focused, evaluates practical applications and market viability'
  },
  {
    id: 'rodriguez',
    name: 'Prof. Elena Rodriguez',
    role: 'Domain Specialist',
    personality: 'theoretical, comprehensive, provides deep contextual background and historical perspective',
    expertise: 'theoretical frameworks, academic literature, conceptual foundations, interdisciplinary connections',
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte - academic female voice
    style: 'scholarly and thorough, connects concepts to broader theoretical frameworks'
  },
  {
    id: 'kim',
    name: 'Alex Kim',
    role: 'Innovation Lead',
    personality: 'forward-thinking, disruptive, challenges conventional thinking with emerging trends',
    expertise: 'emerging technologies, future trends, disruptive innovation, technological implications',
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel - energetic male voice
    style: 'visionary and provocative, explores cutting-edge possibilities and future implications'
  }
];

// Generate AI response with enhanced personality and focus
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null) {
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) throw new Error('Agent not found');

  const conversationContext = conversationHistory.slice(-8).join('\n');
  
  const prompt = `You are ${agent.name}, a ${agent.role}. Your personality: ${agent.personality}
Your expertise: ${agent.expertise}
Your discussion style: ${agent.style}

CRITICAL INSTRUCTIONS:
- Stay STRICTLY within the topic scope defined in the context
- Do NOT deviate to unrelated topics or general discussions
- Build on previous points made by other experts
- Challenge or support specific points with your expertise
- Keep responses focused, insightful, and 2-3 sentences maximum
- Maintain your distinct personality and perspective

Current focused discussion topic: ${context}

Recent expert conversation:
${conversationContext}

${userInput ? `User question/input: "${userInput}" - Address this within the topic scope.` : 'Continue the focused discussion, building on previous expert points or introducing a new angle within the topic scope.'}

Respond as ${agent.name} with your unique perspective, staying strictly on topic:`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
}

// Generate speech using ElevenLabs with better error handling
async function generateSpeech(text, voiceId, elevenLabsApiKey) {
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
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.3,
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
    return null;
  }
}

// Calculate estimated audio duration
function estimateAudioDuration(text) {
  const words = text.split(' ').length;
  const wordsPerMinute = 160; // Slightly faster for focused discussion
  const durationSeconds = (words / wordsPerMinute) * 60;
  return Math.max(durationSeconds * 1000, 2500); // Minimum 2.5 seconds
}

// Process content with multimodal support
app.post('/api/process-content', async (req, res) => {
  try {
    const { content, type, sessionId, geminiApiKey } = req.body;
    
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key required' });
    }

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

    let analysisPrompt;
    let multimodalContent = [];

    if (type === 'multimodal' && content.images && content.images.length > 0) {
      // Handle multimodal content with images
      analysisPrompt = `Analyze the provided text and images to create a focused expert discussion framework.

Text content: ${content.text}

For the uploaded images, analyze their content, context, and relevance to the text.

Create a structured analysis for expert discussion:
1. Core topic definition (be very specific)
2. Key discussion points (3-4 focused areas)
3. Expert perspectives needed (research, strategy, academic, innovation angles)
4. Specific questions or challenges to explore
5. Boundaries - what should NOT be discussed to maintain focus

The discussion must stay strictly within this topic scope. Experts should not deviate to general or unrelated topics.`;

      // Add text content
      multimodalContent.push({ text: analysisPrompt });

      // Add images
      content.images.forEach(image => {
        multimodalContent.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data
          }
        });
      });
    } else {
      // Handle text-only content
      const textContent = typeof content === 'object' ? content.text : content;
      
      analysisPrompt = `Analyze the following content and create a focused expert discussion framework:

${textContent}

Create a structured analysis for expert discussion:
1. Core topic definition (be very specific and focused)
2. Key discussion points (3-4 focused areas only)
3. Expert perspectives needed (research, strategy, academic, innovation angles)
4. Specific questions or challenges to explore within this topic
5. Discussion boundaries - what should NOT be discussed to maintain focus

The experts must stay strictly within this topic scope and not deviate to general discussions.

Keep the analysis concise but comprehensive for a focused 5-15 minute expert discussion.`;

      multimodalContent = [{ text: analysisPrompt }];
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: multimodalContent,
    });

    const analysis = response.text;

    // Store session data with enhanced configuration
    sessions.set(sessionId, {
      topic: analysis,
      conversationHistory: [],
      participants: agents,
      isActive: true,
      isPaused: false,
      currentSpeaker: null,
      conversationQueue: [],
      totalMessages: 0,
      maxMessages: 20, // Focused discussion limit
      nextTimeout: null,
      topicBoundaries: analysis // Store for reference
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
      // Generate focused opening statement from Dr. Chen
      const openingAgent = agents[0]; // Dr. Chen
      const openingPrompt = `Based on this focused topic analysis: ${session.topic}

As Dr. Sarah Chen, provide a precise opening statement that:
1. Clearly defines the specific topic scope
2. Sets expectations for a focused expert discussion
3. Introduces the analytical framework you'll use
4. Is 2-3 sentences maximum

Stay strictly within the topic boundaries defined in the analysis.`;

      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: openingPrompt,
      });

      const message = response.text;
      session.conversationHistory.push(`${openingAgent.name}: ${message}`);
      session.currentSpeaker = openingAgent.id;
      session.totalMessages++;

      // Generate speech
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
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000); // Reduced pause for focused discussion

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
      // Clear any pending timeouts
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }

      // Add user message to history
      session.conversationHistory.push(`User: ${message}`);

      // Emit user message to all participants
      io.to(sessionId).emit('user-message', {
        message,
        timestamp: new Date()
      });

      // Wait a moment then have an agent respond
      session.nextTimeout = setTimeout(async () => {
        await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, message);
      }, 1500);

    } catch (error) {
      console.error('User message error:', error);
      socket.emit('error', 'Failed to process message');
    }
  });

  socket.on('pause-conversation', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.isPaused = true;
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }
      io.to(sessionId).emit('conversation-paused');
    }
  });

  socket.on('resume-conversation', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.isPaused = false;
      io.to(sessionId).emit('conversation-resumed');
      
      // Resume conversation after a short delay
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, session.geminiApiKey, session.elevenLabsApiKey);
      }, 1500);
    }
  });

  socket.on('end-session', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
      }
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
  if (!session || !session.isActive || session.isPaused || session.totalMessages >= session.maxMessages) {
    return;
  }

  try {
    await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey);
  } catch (error) {
    console.error('Synchronized conversation error:', error);
  }
}

// Generate next agent response with enhanced focus
async function generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, userInput = null) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused || session.totalMessages >= session.maxMessages) {
    return;
  }

  try {
    // Select next agent strategically (avoid same agent speaking twice in a row)
    const lastSpeaker = session.currentSpeaker;
    const availableAgents = agents.filter(agent => agent.id !== lastSpeaker);
    
    // Prioritize agents based on conversation flow and expertise relevance
    let nextAgent;
    if (userInput) {
      // If user asked a question, select most relevant expert
      if (userInput.toLowerCase().includes('research') || userInput.toLowerCase().includes('data')) {
        nextAgent = agents.find(a => a.id === 'chen') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('business') || userInput.toLowerCase().includes('strategy')) {
        nextAgent = agents.find(a => a.id === 'thompson') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('theory') || userInput.toLowerCase().includes('academic')) {
        nextAgent = agents.find(a => a.id === 'rodriguez') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('future') || userInput.toLowerCase().includes('innovation')) {
        nextAgent = agents.find(a => a.id === 'kim') || availableAgents[0];
      } else {
        nextAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
      }
    } else {
      nextAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
    }

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
    if (session.totalMessages < session.maxMessages && session.isActive && !session.isPaused) {
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000); // Reduced pause for focused discussion
    } else if (session.totalMessages >= session.maxMessages) {
      // End conversation
      session.nextTimeout = setTimeout(() => {
        io.to(sessionId).emit('conversation-ended', {
          message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic.'
        });
      }, audioDuration + 1500);
    }

  } catch (error) {
    console.error('Next agent response error:', error);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});