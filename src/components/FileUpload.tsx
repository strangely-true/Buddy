import React, { useCallback, useState } from 'react';
import { Upload, File, Image, Type, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onSessionStart: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSessionStart }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');

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
    
    setUploading(true);
    
    // Simulate file processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setUploading(false);
    onSessionStart();
  };

  const handleTextSubmit = async () => {
    if (!textPrompt.trim()) return;
    
    setUploading(true);
    
    // Simulate text processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setUploading(false);
    onSessionStart();
  };

  return (
    <div className="space-y-8">
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
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
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <p className="text-lg text-slate-600">Processing your content...</p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-slate-800 mb-2">
              Upload Documents or Images
            </h3>
            <p className="text-slate-600 mb-6">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <File className="w-4 h-4" />
                <span>PDF, DOC, TXT</span>
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
            or start with a prompt
          </span>
        </div>
      </div>

      {/* Text Prompt Input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <Type className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
              placeholder="Describe a topic you'd like the AI agents to discuss..."
              className="w-full h-32 p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textPrompt.trim() || uploading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting conversation...</span>
                </div>
              ) : (
                'Start AI Conference'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;