import React, { useCallback, useState } from 'react';
import { Upload, File, Image, Type, Loader2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';

interface FileUploadProps {
  onSessionStart: (sessionId: string) => void;
  isApiKeyConfigured: boolean;
  geminiApiKey: string;
  elevenLabsApiKey: string;
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;
    
    if (!isApiKeyConfigured) {
      setError('Please configure your Gemini API key before uploading files.');
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...files]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!textPrompt.trim() && uploadedFiles.length === 0) return;
    
    if (!isApiKeyConfigured) {
      setError('Please configure your Gemini API key before starting a discussion.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      let content = textPrompt.trim();
      
      // Process uploaded files
      if (uploadedFiles.length > 0) {
        const fileDescriptions = await Promise.all(
          uploadedFiles.map(async (file) => {
            if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
              const text = await file.text();
              return `File: ${file.name}\nContent: ${text}`;
            } else if (file.type.startsWith('image/')) {
              // For images, we'll use Gemini's vision capabilities
              const base64 = await fileToBase64(file);
              return {
                type: 'image',
                name: file.name,
                data: base64,
                mimeType: file.type
              };
            } else {
              return `File: ${file.name} (${file.type}) - ${(file.size / 1024).toFixed(1)} KB`;
            }
          })
        );

        const textFiles = fileDescriptions.filter(desc => typeof desc === 'string');
        const imageFiles = fileDescriptions.filter(desc => typeof desc === 'object');

        if (textFiles.length > 0) {
          content += '\n\nUploaded Documents:\n' + textFiles.join('\n\n');
        }

        // For images, we'll include them in the multimodal request
        if (imageFiles.length > 0) {
          content += `\n\nUploaded Images: ${imageFiles.map(img => img.name).join(', ')}`;
        }
      }

      await processContent(content, uploadedFiles);
    } catch (error) {
      console.error('Processing error:', error);
      setError('Failed to process content. Please check your API key configuration.');
      setUploading(false);
    }
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

  const processContent = async (content: string, files: File[]) => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare multimodal content for Gemini
      const multimodalContent = {
        text: content,
        images: []
      };

      // Process image files for multimodal input
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const base64 = await fileToBase64(file);
          multimodalContent.images.push({
            name: file.name,
            data: base64,
            mimeType: file.type
          });
        }
      }

      const response = await axios.post('http://localhost:3001/api/process-content', {
        content: multimodalContent,
        type: files.length > 0 ? 'multimodal' : 'text prompt',
        sessionId,
        geminiApiKey
      });

      if (response.data.success) {
        setUploading(false);
        onSessionStart(sessionId);
      } else {
        throw new Error('Failed to process content');
      }
    } catch (error) {
      console.error('Content processing error:', error);
      setError('Failed to process content. Please check your API key and try again.');
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
              : isApiKeyConfigured
              ? 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              : 'border-slate-200 bg-slate-50'
          }`}
          onDragEnter={isApiKeyConfigured ? handleDrag : undefined}
          onDragLeave={isApiKeyConfigured ? handleDrag : undefined}
          onDragOver={isApiKeyConfigured ? handleDrag : undefined}
          onDrop={isApiKeyConfigured ? handleDrop : undefined}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp,.csv,.json"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || !isApiKeyConfigured}
          />
          
          <Upload className={`w-8 h-8 mx-auto mb-3 ${isApiKeyConfigured ? 'text-slate-400' : 'text-slate-300'}`} />
          <p className={`text-sm ${isApiKeyConfigured ? 'text-slate-600' : 'text-slate-400'}`}>
            {isApiKeyConfigured 
              ? 'Drop files here or click to upload (optional)'
              : 'Configure API keys to upload files'
            }
          </p>
          <div className={`flex items-center justify-center space-x-4 text-xs mt-2 ${isApiKeyConfigured ? 'text-slate-500' : 'text-slate-400'}`}>
            <div className="flex items-center space-x-1">
              <File className="w-3 h-3" />
              <span>Documents</span>
            </div>
            <div className="flex items-center space-x-1">
              <Image className="w-3 h-3" />
              <span>Images</span>
            </div>
          </div>
        </div>

        {/* Uploaded Files Display */}
        {uploadedFiles.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Uploaded Files:</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200">
                  <div className="flex items-center space-x-2">
                    {file.type.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-green-600" />
                    ) : (
                      <File className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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
              <Type className={`w-5 h-5 ${isApiKeyConfigured ? 'text-slate-400' : 'text-slate-300'}`} />
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder={isApiKeyConfigured 
                  ? "Describe a topic, ask a question, or provide context for your uploaded files. The AI experts will create a focused discussion around your input..."
                  : "Configure your API keys to start a conversation..."
                }
                className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                disabled={uploading || !isApiKeyConfigured}
              />
              <button
                onClick={handleSubmit}
                disabled={(!textPrompt.trim() && uploadedFiles.length === 0) || uploading || !isApiKeyConfigured}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center justify-center space-x-2">
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

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium mb-2">💡 Tips for Focused Discussions</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Be specific about what aspects you want the experts to focus on</li>
          <li>• Upload relevant documents or images to provide context</li>
          <li>• Ask targeted questions to guide the expert analysis</li>
          <li>• The discussion will stay focused on your topic - experts won't deviate</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;