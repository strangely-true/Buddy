// AI Service for Gemini integration
export class AIService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  async generateResponse(prompt: string, context?: string): Promise<string> {
    if (!this.apiKey) {
      // Mock response for development
      return this.getMockResponse(prompt);
    }

    try {
      const response = await fetch(`${this.baseUrl}/models/gemini-pro:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: context ? `${context}\n\n${prompt}` : prompt
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      console.error('AI Service error:', error);
      return this.getMockResponse(prompt);
    }
  }

  private getMockResponse(prompt: string): string {
    const mockResponses = [
      "That's a fascinating perspective. Let me build on that idea from a different angle.",
      "I find this particularly interesting because it challenges conventional thinking.",
      "From my analysis, I see several key implications we should consider.",
      "This aligns with current research trends, but I'd like to add a nuance.",
      "Let me offer a contrasting viewpoint that might enrich our discussion.",
    ];
    
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  async processDocument(file: File): Promise<string> {
    // Mock document processing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`Processed document: ${file.name}. Key themes identified: innovation, technology trends, future implications.`);
      }, 2000);
    });
  }
}

export const aiService = new AIService();