import React, { useCallback, useState } from 'react';
import { Upload, File, Image, Type, Loader2, AlertCircle, X, Settings } from 'lucide-react';
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
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Combined Input Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* File Upload Zone */}
        <div
          className={`relative border-2 border-dashed rounded-t-xl p-8 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
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
          
          <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-600">
            Drop files here or click to upload (optional)
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs mt-2 text-slate-500">
            <div className="flex items-center space-x-1">
              <File className="w-3 h-3" />
              <span>Text Files</span>
            </div>
            <div className="flex items-center space-x-1">
              <Image className="w-3 h-3" />
              <span>Images</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supported: .txt, .md, .csv, .json, .jpg, .png, .webp
          </p>
          {!isApiKeyConfigured && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Files will be processed locally without API key
            </p>
          )}
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Files:</h4>
            <div className="space-y-2">
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200">
                  <div className="flex items-center space-x-2">
                    {uploadedFile.file.type.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-green-600" />
                    ) : (
                      <File className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm text-slate-700">{uploadedFile.file.name}</span>
                    <span className="text-xs text-slate-500">({(uploadedFile.file.size / 1024).toFixed(1)} KB)</span>
                    <span className="text-xs text-green-600">✓ Processed</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <Type className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Describe a topic, ask a question, or provide context for your uploaded files. The AI experts will create a focused discussion around your input..."
                className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                disabled={uploading}
              />
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowPersonalityConfig(!showPersonalityConfig)}
                  className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure AI Personalities (Optional)</span>
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={(!textPrompt.trim() && uploadedFiles.length === 0) || uploading}
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Starting AI Discussion...</span>
                    </div>
                  ) : (
                    'Start Focused AI Discussion'
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

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium mb-2">💡 Tips for Focused Discussions</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Be specific about what aspects you want the experts to focus on</li>
          <li>• Upload relevant documents or images to provide context</li>
          <li>• Ask targeted questions to guide the expert analysis</li>
          <li>• The discussion will stay focused on your topic - experts won't deviate</li>
          {!isApiKeyConfigured && (
            <li>• <strong>Without API key:</strong> Basic discussion mode with default responses</li>
          )}
        </ul>
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">AI Expert Personalities</h3>
        <button
          onClick={resetToDefaults}
          className="text-sm text-slate-600 hover:text-slate-800 underline"
        >
          Reset to Defaults
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(personalities).map(([agentId, agent]) => (
          <div key={agentId} className="space-y-3 p-4 border border-slate-200 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={agent.name}
                onChange={(e) => handlePersonalityChange(agentId, 'name', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input
                type="text"
                value={agent.role}
                onChange={(e) => handlePersonalityChange(agentId, 'role', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Personality</label>
              <textarea
                value={agent.personality}
                onChange={(e) => handlePersonalityChange(agentId, 'personality', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expertise</label>
              <textarea
                value={agent.expertise}
                onChange={(e) => handlePersonalityChange(agentId, 'expertise', e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-slate-600">
        <p>💡 Customize how each AI expert behaves and responds. Changes are saved automatically.</p>
      </div>
    </div>
  );
};

export default FileUpload;