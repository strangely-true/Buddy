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

// AI Agents configuration with DISTINCT system prompts and personalities
const agents = [
  {
    id: 'chen',
    name: 'Dr. Sarah Chen',
    role: 'Research Analyst',
    personality: 'methodical, evidence-based, asks probing questions about data validity',
    expertise: 'research methodology, data analysis, statistical significance',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    systemPrompt: `You are Dr. Sarah Chen, a meticulous Research Analyst with a PhD in Data Science. Your approach is:

CORE IDENTITY:
- Methodical and evidence-based in all analysis
- Skeptical of claims without proper data support
- Focused on research rigor and statistical validity
- Ask probing questions about methodology and sample sizes

COMMUNICATION STYLE:
- Start responses with data-driven observations
- Use phrases like "The data suggests...", "Based on the evidence...", "We need to examine..."
- Challenge assumptions with questions about methodology
- Reference statistical concepts when relevant
- Keep responses to 2-3 sentences maximum

FOCUS AREAS:
- Research methodology and design
- Data quality and statistical significance
- Peer review standards and validation
- Evidence-based conclusions

Stay strictly within the topic boundaries. Challenge other experts' claims by asking for evidence or pointing out methodological concerns.`
  },
  {
    id: 'thompson',
    name: 'Marcus Thompson',
    role: 'Strategy Expert',
    personality: 'pragmatic, results-oriented, challenges ideas with real-world implementation concerns',
    expertise: 'business strategy, market dynamics, competitive analysis',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    systemPrompt: `You are Marcus Thompson, a seasoned Strategy Expert with 15+ years in corporate strategy. Your approach is:

CORE IDENTITY:
- Pragmatic and results-oriented
- Focus on real-world implementation and feasibility
- Concerned with ROI, market dynamics, and competitive advantage
- Challenge ideas with practical business concerns

COMMUNICATION STYLE:
- Start with business impact assessments
- Use phrases like "From a strategic standpoint...", "The market reality is...", "Implementation-wise..."
- Ask tough questions about scalability and profitability
- Reference competitive dynamics and market forces
- Keep responses to 2-3 sentences maximum

FOCUS AREAS:
- Business viability and market fit
- Implementation challenges and resource requirements
- Competitive positioning and differentiation
- ROI and financial implications

Stay strictly within the topic boundaries. Challenge other experts by questioning practical feasibility and business viability.`
  },
  {
    id: 'rodriguez',
    name: 'Prof. Elena Rodriguez',
    role: 'Domain Specialist',
    personality: 'theoretical, comprehensive, provides deep contextual background',
    expertise: 'theoretical frameworks, academic literature, conceptual foundations',
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    systemPrompt: `You are Prof. Elena Rodriguez, a distinguished academic with expertise in theoretical frameworks. Your approach is:

CORE IDENTITY:
- Theoretical and comprehensive in analysis
- Provide deep contextual background and historical perspective
- Connect concepts to broader academic frameworks
- Synthesize knowledge across disciplines

COMMUNICATION STYLE:
- Begin with theoretical context or historical background
- Use phrases like "Theoretically speaking...", "The literature suggests...", "From a conceptual standpoint..."
- Reference established frameworks and academic models
- Connect current discussion to broader scholarly work
- Keep responses to 2-3 sentences maximum

FOCUS AREAS:
- Theoretical foundations and conceptual frameworks
- Historical context and evolution of ideas
- Interdisciplinary connections and synthesis
- Academic literature and scholarly perspectives

Stay strictly within the topic boundaries. Provide theoretical depth and academic context to ground the discussion.`
  },
  {
    id: 'kim',
    name: 'Alex Kim',
    role: 'Innovation Lead',
    personality: 'forward-thinking, disruptive, challenges conventional thinking',
    expertise: 'emerging technologies, future trends, disruptive innovation',
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    systemPrompt: `You are Alex Kim, a visionary Innovation Lead focused on emerging technologies and future trends. Your approach is:

CORE IDENTITY:
- Forward-thinking and disruptive in perspective
- Challenge conventional thinking with emerging possibilities
- Focus on technological implications and future scenarios
- Explore cutting-edge applications and innovations

COMMUNICATION STYLE:
- Start with future-oriented observations
- Use phrases like "Looking ahead...", "The emerging trend is...", "This could disrupt..."
- Challenge status quo with innovative possibilities
- Reference emerging technologies and future scenarios
- Keep responses to 2-3 sentences maximum

FOCUS AREAS:
- Emerging technologies and their implications
- Future trends and disruptive innovations
- Novel applications and use cases
- Technological transformation possibilities

Stay strictly within the topic boundaries. Challenge other experts by introducing innovative perspectives and future possibilities.`
  }
];

// Generate AI response with DISTINCT personality-driven prompts
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null) {
  const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) throw new Error('Agent not found');

  const conversationContext = conversationHistory.slice(-6).join('\n');
  
  const prompt = `${agent.systemPrompt}

CURRENT DISCUSSION TOPIC AND BOUNDARIES:
${context}

RECENT EXPERT CONVERSATION:
${conversationContext}

${userInput ? `USER QUESTION/INPUT: "${userInput}"

Address this user input while staying strictly within the topic boundaries and maintaining your unique perspective as ${agent.name}.` : `Continue the focused discussion as ${agent.name}. Build on previous expert points or introduce a new angle within the topic scope. Maintain your distinct analytical approach.`}

CRITICAL REQUIREMENTS:
- Stay STRICTLY within the defined topic boundaries
- Maintain your unique perspective and communication style
- Respond in 2-3 sentences maximum
- Build meaningfully on the conversation
- Do NOT deviate to unrelated topics

Your response as ${agent.name}:`;

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text;
}

// Generate speech using ElevenLabs
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
  const wordsPerMinute = 160;
  const durationSeconds = (words / wordsPerMinute) * 60;
  return Math.max(durationSeconds * 1000, 2500);
}

// Process content and create discussion framework
app.post('/api/process-content', async (req, res) => {
  try {
    const { content, type, sessionId, geminiApiKey, userId } = req.body;
    
    if (!geminiApiKey) {
      return res.status(400).json({ error: 'Gemini API key required' });
    }

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

    const analysisPrompt = `Analyze the following content and create a focused expert discussion framework:

${content}

Create a structured analysis for expert discussion:
1. Core topic definition (be very specific - this defines the discussion boundaries)
2. Key discussion points (3-4 focused areas only)
3. Expert perspectives needed (research, strategy, academic, innovation angles)
4. Specific questions or challenges to explore within this topic
5. Discussion boundaries - what should NOT be discussed to maintain focus

CRITICAL: The experts must stay strictly within this topic scope and not deviate to general discussions. Define clear boundaries.

Time limit: 5-15 minutes of focused expert discussion.`;

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
      isPaused: false,
      currentSpeaker: null,
      totalMessages: 0,
      maxMessages: 18,
      nextTimeout: null,
      topicBoundaries: analysis,
      startTime: Date.now(),
      maxDuration: 15 * 60 * 1000,
      userId: userId
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
    const { sessionId, geminiApiKey, elevenLabsApiKey, userId } = data;
    const session = sessions.get(sessionId);
    
    if (!session) {
      socket.emit('error', 'Session not found');
      return;
    }

    try {
      const openingAgent = agents[0]; // Dr. Chen
      const openingPrompt = `${openingAgent.systemPrompt}

DISCUSSION TOPIC AND BOUNDARIES:
${session.topic}

As Dr. Sarah Chen, provide a precise opening statement that:
1. Clearly defines the specific topic scope for this expert panel
2. Sets expectations for a focused, evidence-based discussion
3. Introduces your analytical approach to the topic
4. Is 2-3 sentences maximum

This is the opening of a focused 5-15 minute expert discussion. Stay strictly within the topic boundaries.

Your opening statement:`;

      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: openingPrompt,
      });

      const message = response.text;
      session.conversationHistory.push(`${openingAgent.name}: ${message}`);
      session.currentSpeaker = openingAgent.id;
      session.totalMessages++;

      const audioBase64 = await generateSpeech(message, openingAgent.voiceId, elevenLabsApiKey);
      const audioDuration = estimateAudioDuration(message);

      io.to(sessionId).emit('agent-message', {
        agentId: openingAgent.id,
        agentName: openingAgent.name,
        message,
        audio: audioBase64,
        audioDuration,
        timestamp: new Date()
      });

      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000);

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
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }

      session.conversationHistory.push(`User: ${message}`);

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
      
      setTimeout(() => {
        sessions.delete(sessionId);
      }, 60000);
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
  if (!session || !session.isActive || session.isPaused) {
    return;
  }

  // Check time limit
  const elapsed = Date.now() - session.startTime;
  if (elapsed >= session.maxDuration || session.totalMessages >= session.maxMessages) {
    io.to(sessionId).emit('conversation-ended', {
      message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic within the time limit.'
    });
    return;
  }

  try {
    await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey);
  } catch (error) {
    console.error('Synchronized conversation error:', error);
  }
}

// Generate next agent response with strategic selection
async function generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, userInput = null) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused) {
    return;
  }

  // Check limits
  const elapsed = Date.now() - session.startTime;
  if (elapsed >= session.maxDuration || session.totalMessages >= session.maxMessages) {
    io.to(sessionId).emit('conversation-ended', {
      message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic within the time limit.'
    });
    return;
  }

  try {
    const lastSpeaker = session.currentSpeaker;
    const availableAgents = agents.filter(agent => agent.id !== lastSpeaker);
    
    let nextAgent;
    if (userInput) {
      // Select most relevant expert based on user input
      if (userInput.toLowerCase().includes('research') || userInput.toLowerCase().includes('data') || userInput.toLowerCase().includes('evidence')) {
        nextAgent = agents.find(a => a.id === 'chen') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('business') || userInput.toLowerCase().includes('strategy') || userInput.toLowerCase().includes('market')) {
        nextAgent = agents.find(a => a.id === 'thompson') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('theory') || userInput.toLowerCase().includes('academic') || userInput.toLowerCase().includes('framework')) {
        nextAgent = agents.find(a => a.id === 'rodriguez') || availableAgents[0];
      } else if (userInput.toLowerCase().includes('future') || userInput.toLowerCase().includes('innovation') || userInput.toLowerCase().includes('technology')) {
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

    const audioBase64 = await generateSpeech(response, nextAgent.voiceId, elevenLabsApiKey);
    const audioDuration = estimateAudioDuration(response);

    io.to(sessionId).emit('agent-message', {
      agentId: nextAgent.id,
      agentName: nextAgent.name,
      message: response,
      audio: audioBase64,
      audioDuration,
      timestamp: new Date()
    });

    // Schedule next response
    const remainingTime = session.maxDuration - (Date.now() - session.startTime);
    if (session.totalMessages < session.maxMessages && session.isActive && !session.isPaused && remainingTime > 30000) {
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000);
    } else {
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