import React, { useCallback, useState } from 'react';
import { Upload, File, Image, Type, Loader2, AlertCircle, X, Settings, Sparkles, Zap } from 'lucide-react';
import axios from 'axios';

interface FileUploadProps {
  onSessionStart: (sessionId: string) => void;
  isApiKeyConfigured: boolean;
  geminiApiKey: string;
  elevenLabsApiKey: string;
}

interface UploadedFile {
  file: File;
  content?: string;
  base64?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onSessionStart, 
  isApiKeyConfigured, 
  geminiApiKey,
  elevenLabsApiKey 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showPersonalityConfig, setShowPersonalityConfig] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Filter supported file types
    const supportedFiles = files.filter(file => {
      const isText = file.type.startsWith('text/') || 
                    file.name.endsWith('.txt') || 
                    file.name.endsWith('.md') ||
                    file.name.endsWith('.csv') ||
                    file.name.endsWith('.json');
      const isImage = file.type.startsWith('image/') && 
                     (file.type.includes('jpeg') || 
                      file.type.includes('jpg') || 
                      file.type.includes('png') || 
                      file.type.includes('webp'));
      return isText || isImage;
    });

    if (supportedFiles.length !== files.length) {
      setError('Some files were skipped. Only text files (.txt, .md, .csv, .json) and images (.jpg, .png, .webp) are supported.');
    } else {
      setError(null);
    }
    
    // Process files immediately and store content
    const processedFiles: UploadedFile[] = [];
    
    for (const file of supportedFiles) {
      try {
        if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          processedFiles.push({ file, base64 });
        } else {
          const content = await readTextFile(file);
          processedFiles.push({ file, content });
        }
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        setError(`Failed to process file: ${file.name}`);
        return;
      }
    }
    
    setUploadedFiles(prev => [...prev, ...processedFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!textPrompt.trim() && uploadedFiles.length === 0) {
      setError('Please enter a topic or upload files to start the discussion.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let content = textPrompt.trim();
      const images: any[] = [];
      
      // Process uploaded files from temporary storage
      if (uploadedFiles.length > 0) {
        const textContents: string[] = [];
        
        for (const uploadedFile of uploadedFiles) {
          if (uploadedFile.base64) {
            // Handle images for multimodal input
            images.push({
              name: uploadedFile.file.name,
              data: uploadedFile.base64,
              mimeType: uploadedFile.file.type
            });
          } else if (uploadedFile.content) {
            // Handle text files
            textContents.push(`File: ${uploadedFile.file.name}\nContent:\n${uploadedFile.content}\n`);
          }
        }

        // Add text file contents to the main content
        if (textContents.length > 0) {
          content += '\n\nUploaded Documents:\n' + textContents.join('\n');
        }

        // Add image descriptions
        if (images.length > 0) {
          content += `\n\nUploaded Images: ${images.map(img => img.name).join(', ')}`;
        }
      }

      // If no Gemini API key, start session with temporary content
      if (!isApiKeyConfigured) {
        // Store content temporarily in sessionStorage
        const tempContent = {
          text: content,
          images: images,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem(`session_${sessionId}`, JSON.stringify(tempContent));
        
        console.log('Starting session without API key - content stored temporarily');
        setUploading(false);
        onSessionStart(sessionId);
        return;
      }

      // Prepare content for API
      const requestContent = images.length > 0 ? {
        text: content,
        images: images
      } : content;

      console.log('Sending content to API:', { 
        hasImages: images.length > 0, 
        textLength: content.length,
        imageCount: images.length 
      });

      const response = await axios.post('http://localhost:3001/api/process-content', {
        content: requestContent,
        type: images.length > 0 ? 'multimodal' : 'text',
        sessionId,
        geminiApiKey
      });

      if (response.data.success) {
        console.log('Content processed successfully');
        setUploading(false);
        onSessionStart(sessionId);
      } else {
        throw new Error(response.data.error || 'Failed to process content');
      }
    } catch (error) {
      console.error('Content processing error:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        setError(`Failed to process content: ${errorMessage}`);
      } else {
        setError('Failed to process content. Please check your API key and try again.');
      }
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-300 font-semibold text-lg mb-1">Error</h4>
              <p className="text-red-200/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Input Card */}
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden shadow-2xl">
        {/* File Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-t-3xl p-12 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-400/50 bg-blue-500/10' 
              : 'border-gray-600/50 hover:border-gray-500/50 hover:bg-gray-700/30'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.jpg,.jpeg,.png,.webp"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          <div className="relative">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop files here or click to upload
            </h3>
            <p className="text-gray-300 mb-4">
              Add documents or images to enhance your AI discussion
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4" />
                <span>Text Files</span>
              </div>
              <div className="flex items-center space-x-2">
                <Image className="w-4 h-4" />
                <span>Images</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Supported: .txt, .md, .csv, .json, .jpg, .png, .webp
            </p>
            {!isApiKeyConfigured && (
              <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-300 font-medium">
                  Files processed locally without API key
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-700/50 bg-gray-700/30">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Uploaded Files</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4 border border-gray-600/30">
                  <div className="flex items-center space-x-3">
                    {uploadedFile.file.type.startsWith('image/') ? (
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center">
                        <Image className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
                        <File className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div>
                      <span className="text-white font-medium">{uploadedFile.file.name}</span>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-gray-400">({(uploadedFile.file.size / 1024).toFixed(1)} KB)</span>
                        <span className="text-green-400 font-medium">✓ Processed</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Type className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Describe your topic, ask questions, or provide context for your files. Our AI experts will create a focused discussion around your input..."
                className="w-full h-40 p-6 bg-gray-700/50 border border-gray-600/50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:bg-gray-800/50 disabled:text-gray-400 text-white placeholder-gray-400 transition-all duration-200"
                disabled={uploading}
              />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setShowPersonalityConfig(!showPersonalityConfig)}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors group"
                >
                  <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                  <span className="text-sm font-medium">Configure AI Personalities</span>
                  <span className="text-xs text-gray-500">(Optional)</span>
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={(!textPrompt.trim() && uploadedFiles.length === 0) || uploading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Initializing AI Discussion...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-3">
                      <Sparkles className="w-5 h-5" />
                      <span>Start AI Expert Discussion</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Configuration */}
      {showPersonalityConfig && (
        <PersonalityConfig />
      )}

      {/* Tips Card */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-sm">
        <h4 className="text-blue-300 font-semibold text-lg mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5" />
          <span>Tips for Engaging Discussions</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-200/80">
          <div className="space-y-2">
            <p>• Be specific about focus areas for expert analysis</p>
            <p>• Upload relevant documents for deeper context</p>
          </div>
          <div className="space-y-2">
            <p>• Ask targeted questions to guide discussions</p>
            <p>• Experts maintain focus on your chosen topic</p>
          </div>
          {!isApiKeyConfigured && (
            <div className="md:col-span-2 mt-2 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
              <p className="text-amber-300 font-medium">
                <strong>Demo Mode:</strong> Basic discussion with default responses (API key required for full experience)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Personality Configuration Component
const PersonalityConfig: React.FC = () => {
  const [personalities, setPersonalities] = useState(() => {
    const saved = localStorage.getItem('ai_personalities');
    return saved ? JSON.parse(saved) : {
      chen: {
        name: 'Dr. Sarah Chen',
        role: 'Research Analyst',
        personality: 'methodical, evidence-based, asks probing questions about data validity and research methodology',
        expertise: 'research methodology, data analysis, statistical significance, peer review standards'
      },
      thompson: {
        name: 'Marcus Thompson',
        role: 'Strategy Expert',
        personality: 'pragmatic, results-oriented, challenges ideas with real-world implementation concerns',
        expertise: 'business strategy, market dynamics, competitive analysis, ROI assessment'
      },
      rodriguez: {
        name: 'Prof. Elena Rodriguez',
        role: 'Domain Specialist',
        personality: 'theoretical, comprehensive, provides deep contextual background and historical perspective',
        expertise: 'theoretical frameworks, academic literature, conceptual foundations, interdisciplinary connections'
      },
      kim: {
        name: 'Alex Kim',
        role: 'Innovation Lead',
        personality: 'forward-thinking, disruptive, challenges conventional thinking with emerging trends',
        expertise: 'emerging technologies, future trends, disruptive innovation, technological implications'
      }
    };
  });

  const handlePersonalityChange = (agentId: string, field: string, value: string) => {
    const updated = {
      ...personalities,
      [agentId]: {
        ...personalities[agentId],
        [field]: value
      }
    };
    setPersonalities(updated);
    localStorage.setItem('ai_personalities', JSON.stringify(updated));
  };

  const resetToDefaults = () => {
    localStorage.removeItem('ai_personalities');
    window.location.reload();
  };

  const agentColors = {
    chen: 'from-purple-500 to-indigo-500',
    thompson: 'from-blue-500 to-cyan-500',
    rodriguez: 'from-green-500 to-emerald-500',
    kim: 'from-orange-500 to-red-500'
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Settings className="w-6 h-6 text-purple-400" />
          <span>AI Expert Personalities</span>
        </h3>
        <button
          onClick={resetToDefaults}
          className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600/50 hover:border-gray-500/50 rounded-xl transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.entries(personalities).map(([agentId, agent]) => (
          <div key={agentId} className="space-y-4 p-6 bg-gray-700/30 border border-gray-600/30 rounded-2xl">
            <div className={`w-12 h-12 bg-gradient-to-r ${agentColors[agentId as keyof typeof agentColors]} rounded-xl flex items-center justify-center mb-4`}>
              <span className="text-white font-bold text-lg">
                {agent.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={agent.name}
                onChange={(e) => handlePersonalityChange(agentId, 'name', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Role</label>
              <input
                type="text"
                value={agent.role}
                onChange={(e) => handlePersonalityChange(agentId, 'role', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Personality</label>
              <textarea
                value={agent.personality}
                onChange={(e) => handlePersonalityChange(agentId, 'personality', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Expertise</label>
              <textarea
                value={agent.expertise}
                onChange={(e) => handlePersonalityChange(agentId, 'expertise', e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                rows={3}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-blue-300 text-sm flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Customize how each AI expert behaves and responds. Changes are saved automatically and apply to new discussions.</span>
        </p>
      </div>
    </div>
  );
};

export default FileUpload;