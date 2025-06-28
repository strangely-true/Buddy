import React, { useCallback, useState } from 'react';
import { Upload, File, Image, Type, Loader2, AlertCircle } from 'lucide-react';
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
    
    if (!isApiKeyConfigured) {
      setError('Please configure your Gemini API key before uploading files.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          
          let textContent = '';
          let documentType = 'document';
          
          if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
            textContent = content;
            documentType = 'text document';
          } else if (file.type === 'application/pdf') {
            textContent = `PDF Document Analysis Request:
            
File: ${file.name}
Size: ${(file.size / 1024).toFixed(1)} KB

Please analyze this PDF document and extract key insights, themes, and discussion points. Focus on:
- Main concepts and ideas
- Key arguments or findings
- Areas for debate or further exploration
- Practical implications
- Different perspectives that could be explored

Create a focused discussion around the core content of this document.`;
            documentType = 'PDF document';
          } else if (file.type.startsWith('image/')) {
            textContent = `Image Analysis Request:
            
File: ${file.name}
Type: ${file.type}
Size: ${(file.size / 1024).toFixed(1)} KB

Please analyze this image and create a discussion around:
- Visual elements and composition
- Potential meanings or interpretations
- Context and implications
- Different analytical perspectives
- Relevant themes for discussion

Focus on creating meaningful dialogue about what this image represents or communicates.`;
            documentType = 'image';
          } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
            textContent = `Word Document Analysis Request:
            
File: ${file.name}
Size: ${(file.size / 1024).toFixed(1)} KB

Please analyze this Word document and extract:
- Key themes and concepts
- Main arguments or points
- Discussion-worthy topics
- Different analytical angles
- Practical applications

Create a focused academic discussion around the document's core content.`;
            documentType = 'Word document';
          } else {
            textContent = `Document Analysis Request:
            
File: ${file.name}
Type: ${file.type}
Size: ${(file.size / 1024).toFixed(1)} KB

Please analyze this document and create a structured discussion around:
- Core themes and concepts
- Key insights or findings
- Areas for debate
- Multiple perspectives
- Practical implications

Focus on extracting meaningful discussion points from the document content.`;
            documentType = 'document';
          }
          
          await processContent(textContent, documentType);
        } catch (error) {
          console.error('File processing error:', error);
          setError('Failed to process file. Please check your API key configuration.');
          setUploading(false);
        }
      };
      
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For non-text files, we'll send the file info for analysis
        const textContent = `Document Upload:
        
File: ${file.name}
Type: ${file.type}
Size: ${(file.size / 1024).toFixed(1)} KB

Please create a focused discussion about analyzing and understanding this type of document. Discuss methodologies, approaches, and key considerations for extracting insights from ${file.type} files.`;
        await processContent(textContent, 'document upload');
      }
    } catch (error) {
      console.error('File handling error:', error);
      setError('Failed to process file. Please try again.');
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textPrompt.trim()) return;
    
    if (!isApiKeyConfigured) {
      setError('Please configure your Gemini API key before submitting a prompt.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      await processContent(textPrompt, 'text prompt');
    } catch (error) {
      console.error('Text processing error:', error);
      setError('Failed to process prompt. Please check your API key configuration.');
      setUploading(false);
    }
  };

  const processContent = async (content: string, type: string) => {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await axios.post('http://localhost:3001/api/process-content', {
        content,
        type,
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
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
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
        
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <p className="text-lg text-slate-600">Processing your content with AI...</p>
            <p className="text-sm text-slate-500">Analyzing document and preparing discussion topics</p>
          </div>
        ) : (
          <>
            <Upload className={`w-16 h-16 mx-auto mb-6 ${isApiKeyConfigured ? 'text-slate-400' : 'text-slate-300'}`} />
            <h3 className={`text-2xl font-medium mb-2 ${isApiKeyConfigured ? 'text-slate-800' : 'text-slate-500'}`}>
              Upload Documents for AI Analysis
            </h3>
            <p className={`mb-6 ${isApiKeyConfigured ? 'text-slate-600' : 'text-slate-400'}`}>
              {isApiKeyConfigured 
                ? 'Upload any document and our AI agents will analyze it and create a focused discussion'
                : 'Configure your API keys to upload and analyze documents'
              }
            </p>
            <div className={`flex items-center justify-center space-x-6 text-sm ${isApiKeyConfigured ? 'text-slate-500' : 'text-slate-400'}`}>
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4" />
                <span>PDF, DOC, TXT, CSV</span>
              </div>
              <div className="flex items-center space-x-2">
                <Image className="w-4 h-4" />
                <span>JPG, PNG, WEBP</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500">
            or start with a topic
          </span>
        </div>
      </div>

      {/* Text Prompt Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <Type className={`w-5 h-5 ${isApiKeyConfigured ? 'text-slate-400' : 'text-slate-300'}`} />
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder={isApiKeyConfigured 
                ? "Describe a topic, concept, or question you'd like the AI experts to discuss in detail..."
                : "Configure your API keys to start a conversation..."
              }
              className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              disabled={uploading || !isApiKeyConfigured}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textPrompt.trim() || uploading || !isApiKeyConfigured}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting AI conference...</span>
                </div>
              ) : (
                'Start AI Conference Discussion'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-medium mb-2">💡 Tips for Better Discussions</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Upload research papers, reports, or articles for in-depth analysis</li>
          <li>• Ask specific questions to guide the AI experts' focus</li>
          <li>• Use your voice to join the conversation naturally</li>
          <li>• Pause the discussion anytime to ask follow-up questions</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;