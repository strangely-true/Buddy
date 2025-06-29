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

// Store active sessions with enhanced tracking
const sessions = new Map();

// Default AI Agents configuration - can be overridden by user preferences
const getAgents = (customPersonalities = null) => {
  const defaultAgents = [
    {
      id: 'chen',
      name: 'Dr. Sarah Chen',
      role: 'Research Analyst',
      personality: 'methodical, evidence-based, asks probing questions about data validity and research methodology',
      expertise: 'research methodology, data analysis, statistical significance, peer review standards',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      style: 'analytical and precise, focuses on empirical evidence and research rigor',
      weight: 1.0
    },
    {
      id: 'thompson',
      name: 'Marcus Thompson',
      role: 'Strategy Expert',
      personality: 'pragmatic, results-oriented, challenges ideas with real-world implementation concerns',
      expertise: 'business strategy, market dynamics, competitive analysis, ROI assessment',
      voiceId: 'pNInz6obpgDQGcFmaJgB',
      style: 'direct and business-focused, evaluates practical applications and market viability',
      weight: 1.0
    },
    {
      id: 'rodriguez',
      name: 'Prof. Elena Rodriguez',
      role: 'Domain Specialist',
      personality: 'theoretical, comprehensive, provides deep contextual background and historical perspective',
      expertise: 'theoretical frameworks, academic literature, conceptual foundations, interdisciplinary connections',
      voiceId: 'XB0fDUnXU5powFXDhCwa',
      style: 'scholarly and thorough, connects concepts to broader theoretical frameworks',
      weight: 1.0
    },
    {
      id: 'kim',
      name: 'Alex Kim',
      role: 'Innovation Lead',
      personality: 'forward-thinking, disruptive, challenges conventional thinking with emerging trends',
      expertise: 'emerging technologies, future trends, disruptive innovation, technological implications',
      voiceId: 'onwK4e9ZLuTAKqWW03F9',
      style: 'visionary and provocative, explores cutting-edge possibilities and future implications',
      weight: 1.0
    }
  ];

  // Merge with custom personalities if provided
  if (customPersonalities) {
    return defaultAgents.map(agent => ({
      ...agent,
      ...customPersonalities[agent.id]
    }));
  }

  return defaultAgents;
};

// Enhanced agent selection with weighted randomness and conversation tracking
function selectNextAgent(lastSpeaker, conversationHistory, userInput = null, messageHistory = [], agents) {
  const availableAgents = agents.filter(agent => agent.id !== lastSpeaker);
  
  if (userInput) {
    const relevanceScores = availableAgents.map(agent => {
      let score = agent.weight;
      const input = userInput.toLowerCase();
      
      if (input.includes('research') || input.includes('data') || input.includes('evidence')) {
        score += agent.id === 'chen' ? 2.0 : 0;
      }
      if (input.includes('business') || input.includes('strategy') || input.includes('market')) {
        score += agent.id === 'thompson' ? 2.0 : 0;
      }
      if (input.includes('theory') || input.includes('academic') || input.includes('framework')) {
        score += agent.id === 'rodriguez' ? 2.0 : 0;
      }
      if (input.includes('future') || input.includes('innovation') || input.includes('technology')) {
        score += agent.id === 'kim' ? 2.0 : 0;
      }
      
      score += Math.random() * 0.5;
      return { agent, score };
    });
    
    relevanceScores.sort((a, b) => b.score - a.score);
    const topAgents = relevanceScores.slice(0, 2);
    const totalScore = topAgents.reduce((sum, item) => sum + item.score, 0);
    
    let random = Math.random() * totalScore;
    for (const item of topAgents) {
      random -= item.score;
      if (random <= 0) {
        return item.agent;
      }
    }
    
    return topAgents[0].agent;
  } else {
    const recentSpeakers = messageHistory.slice(-4).map(msg => msg.agentId).filter(Boolean);
    
    const adjustedAgents = availableAgents.map(agent => {
      let weight = agent.weight;
      const recentCount = recentSpeakers.filter(id => id === agent.id).length;
      
      weight *= Math.max(0.3, 1 - (recentCount * 0.3));
      weight += Math.random() * 0.3;
      
      return { agent, weight };
    });
    
    const totalWeight = adjustedAgents.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of adjustedAgents) {
      random -= item.weight;
      if (random <= 0) {
        return item.agent;
      }
    }
    
    return adjustedAgents[0].agent;
  }
}

// Generate AI response with enhanced personality and focus
async function generateAgentResponse(geminiApiKey, agentId, context, conversationHistory, userInput = null, agents) {
  // If no API key, return a mock response
  if (!geminiApiKey) {
    const agent = agents.find(a => a.id === agentId);
    const mockResponses = {
      'chen': [
        "From a research perspective, this raises interesting questions about methodology and data validation.",
        "I'd like to examine the empirical evidence behind these claims more closely.",
        "The statistical significance of these findings needs careful consideration."
      ],
      'thompson': [
        "Looking at this from a strategic standpoint, we need to consider the market implications.",
        "The business case here seems compelling, but implementation challenges are significant.",
        "ROI analysis would be crucial before moving forward with this approach."
      ],
      'rodriguez': [
        "This connects to several theoretical frameworks we should explore further.",
        "The academic literature provides valuable context for understanding these concepts.",
        "From a historical perspective, we've seen similar patterns emerge before."
      ],
      'kim': [
        "This opens up fascinating possibilities for future innovation and disruption.",
        "Emerging technologies could completely transform how we approach this challenge.",
        "We should consider the long-term implications and potential paradigm shifts."
      ]
    };
    
    const responses = mockResponses[agentId] || ["This is an interesting point worth exploring further."];
    return responses[Math.floor(Math.random() * responses.length)];
  }

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
- Bring fresh insights while staying on topic

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
  const wordsPerMinute = 160;
  const durationSeconds = (words / wordsPerMinute) * 60;
  return Math.max(durationSeconds * 1000, 2500);
}

// Process content with multimodal support
app.post('/api/process-content', async (req, res) => {
  try {
    const { content, type, sessionId, geminiApiKey } = req.body;
    
    let analysis = "AI Expert Discussion Topic";
    
    if (geminiApiKey) {
      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

      let analysisPrompt;
      let multimodalContent = [];

      if (type === 'multimodal' && content.images && content.images.length > 0) {
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

        multimodalContent.push({ text: analysisPrompt });

        content.images.forEach(image => {
          multimodalContent.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data
            }
          });
        });
      } else {
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

      analysis = response.text;
    } else {
      // Without API key, create a basic analysis from the content
      const textContent = typeof content === 'object' ? content.text : content;
      analysis = `Expert Discussion Topic: ${textContent.substring(0, 200)}...

The AI experts will discuss this topic from their respective perspectives:
- Research and data analysis viewpoint
- Strategic business considerations  
- Academic and theoretical framework
- Innovation and future implications

This will be a focused discussion staying within the scope of the provided content.`;
    }

    // Store session data with enhanced tracking
    sessions.set(sessionId, {
      topic: analysis,
      conversationHistory: [],
      messageHistory: [],
      participants: getAgents(), // Use default agents, will be updated if custom personalities provided
      isActive: true,
      isPaused: false,
      currentSpeaker: null,
      conversationQueue: [],
      totalMessages: 0,
      maxMessages: 15,
      nextTimeout: null,
      topicBoundaries: analysis,
      lastSpeakers: [],
      startTime: new Date(),
      isEnding: false,
      hasApiKey: !!geminiApiKey
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
    const { sessionId, geminiApiKey, elevenLabsApiKey, customPersonalities } = data;
    const session = sessions.get(sessionId);
    
    if (!session || session.isEnding) {
      socket.emit('error', 'Session not found or ending');
      return;
    }

    try {
      // Update agents with custom personalities if provided
      if (customPersonalities) {
        session.participants = getAgents(customPersonalities);
      }

      const openingAgent = session.participants[0]; // Dr. Chen or custom first agent
      
      let message;
      if (geminiApiKey) {
        const openingPrompt = `Based on this focused topic analysis: ${session.topic}

As ${openingAgent.name}, provide a precise opening statement that:
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

        message = response.text;
      } else {
        // Mock opening without API key
        message = `Welcome everyone. I'm ${openingAgent.name}, and I'll be leading our discussion today. We have an interesting topic to explore from multiple expert perspectives. Let's begin our focused analysis.`;
      }

      session.conversationHistory.push(`${openingAgent.name}: ${message}`);
      session.messageHistory.push({
        agentId: openingAgent.id,
        agentName: openingAgent.name,
        message,
        timestamp: new Date(),
        type: 'ai'
      });
      session.currentSpeaker = openingAgent.id;
      session.totalMessages++;
      session.lastSpeakers = [openingAgent.id];

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

      const randomDelay = 2000 + Math.random() * 2000;
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + randomDelay);

    } catch (error) {
      console.error('Conversation start error:', error);
      socket.emit('error', 'Failed to start conversation');
    }
  });

  socket.on('user-message', async (data) => {
    const { sessionId, message, geminiApiKey, elevenLabsApiKey } = data;
    const session = sessions.get(sessionId);
    
    if (!session || session.isEnding) {
      socket.emit('error', 'Session not found or ending');
      return;
    }

    try {
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
        session.nextTimeout = null;
      }

      session.conversationHistory.push(`User: ${message}`);
      session.messageHistory.push({
        agentId: 'user',
        agentName: 'User',
        message,
        timestamp: new Date(),
        type: 'user'
      });

      io.to(sessionId).emit('user-message', {
        message,
        timestamp: new Date()
      });

      const responseDelay = 1500 + Math.random() * 1000;
      session.nextTimeout = setTimeout(async () => {
        await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, message);
      }, responseDelay);

    } catch (error) {
      console.error('User message error:', error);
      socket.emit('error', 'Failed to process message');
    }
  });

  socket.on('pause-conversation', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session && !session.isEnding) {
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
    if (session && !session.isEnding) {
      session.isPaused = false;
      io.to(sessionId).emit('conversation-resumed');
      
      const resumeDelay = 1500 + Math.random() * 1000;
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, session.geminiApiKey, session.elevenLabsApiKey);
      }, resumeDelay);
    }
  });

  socket.on('end-session', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.isEnding = true;
      if (session.nextTimeout) {
        clearTimeout(session.nextTimeout);
      }
      
      io.to(sessionId).emit('session-ended');
      
      setTimeout(() => {
        sessions.delete(sessionId);
      }, 5000);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Synchronized conversation function with random agent selection
async function startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused || session.totalMessages >= session.maxMessages || session.isEnding) {
    if (session && session.totalMessages >= session.maxMessages && !session.isEnding) {
      session.isEnding = true;
      io.to(sessionId).emit('conversation-ended', {
        message: 'The focused expert discussion has concluded. The specialists have covered the key aspects of your topic.'
      });
    }
    return;
  }

  try {
    await generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey);
  } catch (error) {
    console.error('Synchronized conversation error:', error);
  }
}

// Generate next agent response with enhanced random selection
async function generateNextAgentResponse(sessionId, geminiApiKey, elevenLabsApiKey, userInput = null) {
  const session = sessions.get(sessionId);
  if (!session || !session.isActive || session.isPaused || session.totalMessages >= session.maxMessages || session.isEnding) {
    return;
  }

  try {
    const nextAgent = selectNextAgent(
      session.currentSpeaker, 
      session.conversationHistory, 
      userInput,
      session.messageHistory,
      session.participants
    );

    const response = await generateAgentResponse(
      geminiApiKey,
      nextAgent.id,
      session.topic,
      session.conversationHistory,
      userInput,
      session.participants
    );

    session.conversationHistory.push(`${nextAgent.name}: ${response}`);
    session.messageHistory.push({
      agentId: nextAgent.id,
      agentName: nextAgent.name,
      message: response,
      timestamp: new Date(),
      type: 'ai'
    });
    session.currentSpeaker = nextAgent.id;
    session.totalMessages++;
    
    session.lastSpeakers = [nextAgent.id, ...(session.lastSpeakers || [])].slice(0, 3);

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

    if (session.totalMessages < session.maxMessages && session.isActive && !session.isPaused && !session.isEnding) {
      const nextDelay = 2000 + Math.random() * 3000;
      session.nextTimeout = setTimeout(() => {
        startSynchronizedConversation(sessionId, geminiApiKey, elevenLabsApiKey);
      }, audioDuration + nextDelay);
    } else if (session.totalMessages >= session.maxMessages && !session.isEnding) {
      session.isEnding = true;
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