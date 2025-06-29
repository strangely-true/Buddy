import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

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

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase credentials not found - database features disabled');
}

// Enhanced logging function
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// Store active sessions (for real-time state management)
const sessions = new Map();

// AI Agents configuration
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

// Database helper functions
async function createConversationInDB(sessionId, userId, title, topicAnalysis, contentType) {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        title: title,
        topic_analysis: topicAnalysis,
        content_type: contentType || 'text prompt',
        status: 'active',
        total_messages: 0,
        duration_seconds: 0
      })
      .select()
      .single();

    if (error) {
      log('error', 'Database error creating conversation', error);
      return null;
    }

    log('info', 'Conversation created in database', { conversationId: data.id });
    return data;
  } catch (error) {
    log('error', 'Error creating conversation in database', error);
    return null;
  }
}

async function addMessageToDB(conversationId, speakerId, speakerName, messageContent, messageType, audioDuration = 0) {
  if (!supabase || !conversationId) return null;
  
  try {
    // Get current message count for sequence number
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    const { data, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        speaker_id: speakerId,
        speaker_name: speakerName,
        message_content: messageContent,
        message_type: messageType,
        audio_duration: audioDuration,
        sequence_number: (count || 0) + 1
      })
      .select()
      .single();

    if (error) {
      log('error', 'Database error adding message', error);
      return null;
    }

    // Update conversation stats
    await updateConversationStats(conversationId);
    return data;
  } catch (error) {
    log('error', 'Error adding message to database', error);
    return null;
  }
}

async function updateConversationStats(conversationId) {
  if (!supabase || !conversationId) return;
  
  try {
    // Get message count
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    // Get total audio duration
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('audio_duration')
      .eq('conversation_id', conversationId);

    const totalDuration = messages?.reduce((sum, msg) => sum + (msg.audio_duration || 0), 0) || 0;

    await supabase
      .from('conversations')
      .update({ 
        total_messages: count || 0,
        duration_seconds: Math.floor(totalDuration / 1000),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    log('info', 'Conversation stats updated', { conversationId, totalMessages: count, totalDuration });
  } catch (error) {
    log('error', 'Error updating conversation stats', error);
  }
}

async function updateConversationStatus(conversationId, status) {
  if (!supabase || !conversationId) return;
  
  try {
    await supabase
      .from('conversations')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    log('info', 'Conversation status updated', { conversationId, status });
  } catch (error) {
    log('error', 'Error updating conversation status', error);
  }
}

// Generate conversation title from content
function generateConversationTitle(content, contentType) {
  const maxLength = 60;
  
  if (contentType === 'multimodal') {
    return 'Multimodal Analysis Discussion';
  }
  
  const textContent = typeof content === 'object' ? content.text : content;
  
  // Extract first meaningful sentence or phrase
  const sentences = textContent.split(/[.!?]+/);
  const firstSentence = sentences[0]?.trim();
  
  if (firstSentence && firstSentence.length <= maxLength) {
    return firstSentence;
  }
  
  // Truncate and add ellipsis
  const truncated = textContent.substring(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Generate AI response with DISTINCT personality-driven prompts
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null) {
  log('info', `Generating response for agent: ${agentId}`, { userInput, historyLength: conversationHistory.length });
  
  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) {
      log('error', `Agent not found: ${agentId}`);
      throw new Error('Agent not found');
    }

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

    const responseText = response.text;
    log('info', `Generated response for ${agent.name}`, { responseLength: responseText.length });
    return responseText;
  } catch (error) {
    log('error', `Error generating agent response for ${agentId}`, error);
    throw error;
  }
}

// Generate speech using ElevenLabs
async function generateSpeech(text, voiceId, elevenLabsApiKey) {
  if (!elevenLabsApiKey || elevenLabsApiKey.trim() === '') {
    log('info', 'ElevenLabs API key not provided, skipping speech generation');
    return null;
  }

  try {
    log('info', `Generating speech for voice: ${voiceId}`, { textLength: text.length });
    
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

    log('info', 'Speech generation successful');
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    log('error', 'ElevenLabs API error', { status: error.response?.status, statusText: error.response?.statusText });
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
    log('info', 'Processing content request', { sessionId, type, userId, contentLength: content?.length });
    
    if (!geminiApiKey) {
      log('error', 'Gemini API key missing');
      return res.status(400).json({ error: 'Gemini API key required' });
    }

    if (!content || !content.trim()) {
      log('error', 'Content is empty');
      return res.status(400).json({ error: 'Content is required' });
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

    log('info', 'Sending content to Gemini for analysis');
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: analysisPrompt,
    });

    const analysis = response.text;
    const title = generateConversationTitle(content, type);
    log('info', 'Content analysis completed', { analysisLength: analysis.length, title });

    // Create conversation in database if user is provided
    let conversationId = null;
    if (userId && supabase) {
      const conversation = await createConversationInDB(sessionId, userId, title, analysis, type);
      conversationId = conversation?.id || null;
    }

    // Store session data with proper initialization
    const sessionData = {
      topic: analysis,
      conversationHistory: [],
      participants: agents,
      isActive: false, // Will be set to true when conversation starts
      isPaused: false,
      currentSpeaker: null,
      totalMessages: 0,
      maxMessages: 18,
      nextTimeout: null,
      topicBoundaries: analysis,
      startTime: null, // Will be set when conversation actually starts
      maxDuration: 15 * 60 * 1000,
      userId: userId,
      conversationId: conversationId,
      status: 'prepared', // prepared -> active -> ended
      title: title,
      contentType: type,
      createdAt: Date.now()
    };

    sessions.set(sessionId, sessionData);
    log('info', 'Session created successfully', { sessionId, status: sessionData.status, conversationId });

    res.json({ success: true, analysis, title });
  } catch (error) {
    log('error', 'Content processing error', error);
    res.status(500).json({ error: 'Failed to process content' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  log('info', `User connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    log('info', `User ${socket.id} joined session ${sessionId}`);
    
    // Send session status to client
    const session = sessions.get(sessionId);
    if (session) {
      socket.emit('session-status', { 
        status: session.status, 
        isActive: session.isActive,
        totalMessages: session.totalMessages 
      });
      log('info', `Sent session status to client`, { sessionId, status: session.status });
    } else {
      log('warn', `Session not found when joining: ${sessionId}`);
      socket.emit('error', 'Session not found');
    }
  });

  socket.on('start-conversation', async (data) => {
    const { sessionId, geminiApiKey, elevenLabsApiKey, userId } = data;
    log('info', 'Starting conversation', { sessionId, userId });
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      log('error', `Session not found for start-conversation: ${sessionId}`);
      socket.emit('error', 'Session not found');
      return;
    }

    if (session.status === 'ended') {
      log('warn', `Attempted to start ended session: ${sessionId}`);
      socket.emit('error', 'Session has ended');
      return;
    }

    if (session.isActive) {
      log('warn', `Session already active: ${sessionId}`);
      return;
    }

    // Initialize session for active conversation
    session.isActive = true;
    session.startTime = Date.now();
    session.status = 'active';
    log('info', 'Session activated', { sessionId, startTime: session.startTime });

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

      log('info', 'Generating opening statement');
      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: openingPrompt,
      });

      const message = response.text;
      session.conversationHistory.push(`${openingAgent.name}: ${message}`);
      session.currentSpeaker = openingAgent.id;
      session.totalMessages++;

      log('info', 'Opening statement generated', { agentName: openingAgent.name, messageLength: message.length });

      // Store message in database
      if (session.conversationId) {
        await addMessageToDB(
          session.conversationId,
          openingAgent.id,
          openingAgent.name,
          message,
          'ai',
          estimateAudioDuration(message)
        );
      }

      const audioBase64 = await generateSpeech(message, openingAgent.voiceId, elevenLabsApiKey);
      const audioDuration = estimateAudioDuration(message);

      // Emit to all clients in the session
      io.to(sessionId).emit('agent-message', {
        agentId: openingAgent.id,
        agentName: openingAgent.name,
        message,
        audio: audioBase64,
        audioDuration,
        timestamp: new Date()
      });

      log('info', 'Opening message sent to clients', { sessionId, audioDuration });

      // Schedule next response
      session.nextTimeout = setTimeout(() => {
        log('info', 'Starting synchronized conversation flow');
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000);

    } catch (error) {
      log('error', 'Conversation start error', error);
      session.status = 'error';
      socket.emit('error', 'Failed to start conversation');
    }
  });

  socket.on('user-message', async (data) => {
    const { sessionId, message, geminiApiKey, elevenLabsApiKey } = data;
    log('info', 'User message received', { sessionId, messageLength: message?.length });
    
    const session = sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      log('warn', 'User message sent to inactive session', { sessionId, sessionExists: !!session, isActive: session?.isActive });
      socket.emit('error', 'Session not found or not active');
      return;
    }

    try {
      // Clear any pending timeout
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
        log('info', 'Cleared pending timeout for user message');
      }

      session.conversationHistory.push(`User: ${message}`);

      // Store user message in database
      if (session.conversationId) {
        await addMessageToDB(
          session.conversationId,
          'user',
          'User',
          message,
          'user'
        );
      }

      // Emit user message to all clients for synchronization
      io.to(sessionId).emit('user-message', {
        message,
        timestamp: new Date()
      });

      // Schedule agent response
      session.nextTimeout = setTimeout(async () => {
        log('info', 'Generating agent response to user message');
        await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, message);
      }, 1500);

    } catch (error) {
      log('error', 'User message error', error);
      socket.emit('error', 'Failed to process message');
    }
  });

  socket.on('pause-conversation', (sessionId) => {
    log('info', 'Pause conversation requested', { sessionId });
    const session = sessions.get(sessionId);
    if (session && session.isActive) {
      session.isPaused = true;
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }
      io.to(sessionId).emit('conversation-paused');
      log('info', 'Conversation paused', { sessionId });
    }
  });

  socket.on('resume-conversation', (sessionId) => {
    log('info', 'Resume conversation requested', { sessionId });
    const session = sessions.get(sessionId);
    if (session && session.isActive) {
      session.isPaused = false;
      io.to(sessionId).emit('conversation-resumed');
      
      // Resume conversation flow
      session.nextTimeout = setTimeout(() => {
        log('info', 'Resuming conversation flow');
        startSynchronizedConversation(sessionId, session.geminiApiKey, session.elevenLabsApiKey);
      }, 1500);
      log('info', 'Conversation resumed', { sessionId });
    }
  });

  socket.on('end-session', (sessionId) => {
    log('info', 'End session requested', { sessionId });
    const session = sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.status = 'ended';
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }

      // Update conversation status in database
      if (session.conversationId) {
        updateConversationStatus(session.conversationId, 'completed');
      }
      
      // Clean up session after delay
      setTimeout(() => {
        sessions.delete(sessionId);
        log('info', 'Session deleted from memory', { sessionId });
      }, 60000);
    }
    io.to(sessionId).emit('session-ended');
    log('info', 'Session ended', { sessionId });
  });

  socket.on('disconnect', () => {
    log('info', `User disconnected: ${socket.id}`);
  });
});

// Synchronized conversation function
async function startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused) {
    log('info', 'Skipping conversation - session not ready', { 
      sessionExists: !!session, 
      isActive: session?.isActive, 
      isPaused: session?.isPaused 
    });
    return;
  }

  // Check time and message limits
  const elapsed = session.startTime ? Date.now() - session.startTime : 0;
  if (elapsed >= session.maxDuration || session.totalMessages >= session.maxMessages) {
    log('info', 'Conversation limits reached', { elapsed, totalMessages: session.totalMessages });
    session.isActive = false;
    session.status = 'ended';
    
    // Update conversation status in database
    if (session.conversationId) {
      updateConversationStatus(session.conversationId, 'completed');
    }
    
    io.to(sessionId).emit('conversation-ended', {
      message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic within the time limit.'
    });
    return;
  }

  try {
    await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey);
  } catch (error) {
    log('error', 'Synchronized conversation error', error);
  }
}

// Generate next agent response with strategic selection
async function generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, userInput = null) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused) {
    log('info', 'Skipping agent response - session not ready', { 
      sessionExists: !!session, 
      isActive: session?.isActive, 
      isPaused: session?.isPaused 
    });
    return;
  }

  // Check limits again
  const elapsed = session.startTime ? Date.now() - session.startTime : 0;
  if (elapsed >= session.maxDuration || session.totalMessages >= session.maxMessages) {
    log('info', 'Agent response cancelled - limits reached', { elapsed, totalMessages: session.totalMessages });
    session.isActive = false;
    session.status = 'ended';
    
    // Update conversation status in database
    if (session.conversationId) {
      updateConversationStatus(session.conversationId, 'completed');
    }
    
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

    log('info', 'Selected next agent', { agentId: nextAgent.id, agentName: nextAgent.name });

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

    // Store message in database
    const audioDuration = estimateAudioDuration(response);
    if (session.conversationId) {
      await addMessageToDB(
        session.conversationId,
        nextAgent.id,
        nextAgent.name,
        response,
        'ai',
        audioDuration
      );
    }

    const audioBase64 = await generateSpeech(response, nextAgent.voiceId, elevenLabsApiKey);

    io.to(sessionId).emit('agent-message', {
      agentId: nextAgent.id,
      agentName: nextAgent.name,
      message: response,
      audio: audioBase64,
      audioDuration,
      timestamp: new Date()
    });

    log('info', 'Agent message sent', { 
      sessionId, 
      agentName: nextAgent.name, 
      totalMessages: session.totalMessages,
      audioDuration 
    });

    // Schedule next response if within limits
    const remainingTime = session.maxDuration - (Date.now() - session.startTime);
    if (session.totalMessages < session.maxMessages && session.isActive && !session.isPaused && remainingTime > 30000) {
      session.nextTimeout = setTimeout(() => {
        log('info', 'Scheduling next conversation turn');
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + 2000);
    } else {
      // End conversation
      log('info', 'Ending conversation - limits reached or session ending');
      session.isActive = false;
      session.status = 'ended';
      
      // Update conversation status in database
      if (session.conversationId) {
        updateConversationStatus(session.conversationId, 'completed');
      }
      
      session.nextTimeout = setTimeout(() => {
        io.to(sessionId).emit('conversation-ended', {
          message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic.'
        });
      }, audioDuration + 1500);
    }

  } catch (error) {
    log('error', 'Next agent response error', error);
  }
}

// Get conversation messages endpoint
app.get('/api/conversation/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!supabase) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get conversation by session ID
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('sequence_number', { ascending: true });

    if (msgError) {
      log('error', 'Error getting conversation messages', msgError);
      return res.status(500).json({ error: 'Failed to get messages' });
    }

    res.json({ messages: messages || [] });
  } catch (error) {
    log('error', 'Error in get conversation messages endpoint', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Add session status endpoint for debugging
app.get('/api/session/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    sessionId,
    status: session.status,
    isActive: session.isActive,
    isPaused: session.isPaused,
    totalMessages: session.totalMessages,
    startTime: session.startTime,
    createdAt: session.createdAt,
    currentSpeaker: session.currentSpeaker,
    conversationId: session.conversationId
  });
});

// Add sessions list endpoint for debugging
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    sessionId: id,
    status: session.status,
    isActive: session.isActive,
    totalMessages: session.totalMessages,
    createdAt: session.createdAt,
    conversationId: session.conversationId
  }));
  
  res.json({ sessions: sessionList, count: sessionList.length });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  log('info', `Server running on port ${PORT}`);
});