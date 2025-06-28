// Voice Service for ElevenLabs integration
export class VoiceService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  async synthesizeSpeech(text: string, voiceId: string = 'default'): Promise<Blob | null> {
    if (!this.apiKey) {
      // Mock voice synthesis for development
      return this.getMockAudio();
    }

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (response.ok) {
        return await response.blob();
      }
      
      throw new Error('Voice synthesis failed');
    } catch (error) {
      console.error('Voice Service error:', error);
      return this.getMockAudio();
    }
  }

  private getMockAudio(): Promise<Blob> {
    // Return a mock audio blob for development
    return Promise.resolve(new Blob([], { type: 'audio/mpeg' }));
  }

  async playAudio(audioBlob: Blob): Promise<void> {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = reject;
      audio.play();
    });
  }

  getVoiceProfiles() {
    return [
      { id: 'voice1', name: 'Dr. Sarah Chen', character: 'Professional, analytical' },
      { id: 'voice2', name: 'Marcus Thompson', character: 'Confident, strategic' },
      { id: 'voice3', name: 'Prof. Elena Rodriguez', character: 'Academic, thoughtful' },
      { id: 'voice4', name: 'Alex Kim', character: 'Energetic, innovative' },
    ];
  }
}

export const voiceService = new VoiceService();