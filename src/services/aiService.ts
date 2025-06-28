import { GoogleGenAI } from "@google/genai";

export interface AIAgent {
  id: string;
  name: string;
  role: string;
  personality: string;
  expertise: string;
}

export class AIService {
  private genAI: GoogleGenAI | null = null;
  private conversationHistory: string[] = [];
  private currentTopic: string = '';
  private agents: AIAgent[] = [
    {
      id: 'chen',
      name: 'Dr. Sarah Chen',
      role: 'Research Analyst',
      personality: 'analytical, methodical, data-driven',
      expertise: 'research methodology, data analysis, scientific approach'
    },
    {
      id: 'thompson',
      name: 'Marcus Thompson',
      role: 'Strategy Expert',
      personality: 'strategic, decisive, business-focused',
      expertise: 'business strategy, market analysis, competitive intelligence'
    },
    {
      id: 'rodriguez',
      name: 'Prof. Elena Rodriguez',
      role: 'Domain Specialist',
      personality: 'academic, thorough, theoretical',
      expertise: 'theoretical frameworks, academic research, conceptual analysis'
    },
    {
      id: 'kim',
      name: 'Alex Kim',
      role: 'Innovation Lead',
      personality: 'creative, forward-thinking, disruptive',
      expertise: 'innovation, emerging technologies, future trends'
    }
  ];

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  setApiKey(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async processContent(content: string, type: 'document' | 'image' | 'prompt'): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const analysisPrompt = `Analyze the following ${type} content and extract key themes, topics, and discussion points that would be suitable for an AI conference discussion:

${content}

Provide a structured analysis with:
1. Main topics (3-5 key themes)
2. Discussion angles (different perspectives to explore)
3. Potential questions or debates
4. Areas of interest for each type of expert (research, strategy, academic, innovation)

Keep the analysis concise but comprehensive.`;

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: analysisPrompt,
      });

      this.currentTopic = response.text;
      return response.text;
    } catch (error) {
      console.error('Content processing error:', error);
      throw new Error('Failed to process content with Gemini');
    }
  }

  async generateAgentResponse(agentId: string, context: string, userInput?: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    try {
      const conversationContext = this.conversationHistory.slice(-10).join('\n');
      
      const prompt = `You are ${agent.name}, a ${agent.role} with expertise in ${agent.expertise}. 
Your personality is ${agent.personality}.

Current discussion topic: ${this.currentTopic}

Recent conversation:
${conversationContext}

${userInput ? `A user just said: "${userInput}"` : 'Continue the discussion naturally.'}

Respond as ${agent.name} would, staying in character. Keep responses conversational, insightful, and around 1-2 sentences. Build on previous points or introduce new perspectives related to your expertise.

Response:`;

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const agentResponse = response.text;
      this.conversationHistory.push(`${agent.name}: ${agentResponse}`);
      
      return agentResponse;
    } catch (error) {
      console.error('Agent response error:', error);
      throw new Error('Failed to generate agent response');
    }
  }

  async generateConversationStarter(): Promise<{ agentId: string; message: string }> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const prompt = `Based on this topic analysis: ${this.currentTopic}

Generate an opening statement that Dr. Sarah Chen (Research Analyst) would make to start a conference discussion. Keep it engaging, professional, and around 1-2 sentences.`;

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const message = response.text;
      this.conversationHistory.push(`Dr. Sarah Chen: ${message}`);

      return {
        agentId: 'chen',
        message
      };
    } catch (error) {
      console.error('Conversation starter error:', error);
      return {
        agentId: 'chen',
        message: "Welcome everyone. I've analyzed the content and found several fascinating discussion points. Let's dive into the key themes and explore different perspectives."
      };
    }
  }

  getAgents(): AIAgent[] {
    return this.agents;
  }

  clearConversation() {
    this.conversationHistory = [];
    this.currentTopic = '';
  }

  getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }
}

export const aiService = new AIService();