import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  File, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  FileImage,
  Loader2,
  Sparkles,
  Cloud
} from 'lucide-react';

interface UploadedFile {
  file: File;
  content?: string;
  base64?: string;
  id: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
}

interface FileUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesChange,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.txt', '.md', '.csv', '.json', '.jpg', '.jpeg', '.png', '.webp'],
  disabled = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File): Promise<{ content?: string; base64?: string }> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        // Process image file
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64 });
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      } else {
        // Process text file
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ content: reader.result as string });
        };
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      }
    });
  };

  const simulateProgress = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: Math.min(progress, 100) }
            : f
        )
      );
    }, 200);
    
    return interval;
  };

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    // Check file limits
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create initial file objects
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const uploadedFile of newFiles) {
      try {
        // Start progress simulation
        const progressInterval = simulateProgress(uploadedFile.id);
        
        // Update status to processing
        setTimeout(() => {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id 
                ? { ...f, status: 'processing' }
                : f
            )
          );
        }, 1000);

        // Process the file
        const result = await processFile(uploadedFile.file);
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        // Update with processed content
        setUploadedFiles(prev => {
          const updated = prev.map(f => 
            f.id === uploadedFile.id 
              ? { 
                  ...f, 
                  ...result, 
                  status: 'completed' as const,
                  progress: 100 
                }
              : f
          );
          onFilesChange(updated);
          return updated;
        });
        
      } catch (error) {
        console.error('Error processing file:', uploadedFile.file.name, error);
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, status: 'error', progress: 0 }
              : f
          )
        );
        setError(`Failed to process file: ${uploadedFile.file.name}`);
      }
    }
  }, [uploadedFiles.length, maxFiles, onFilesChange]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesChange(updated);
      return updated;
    });
    setError(null);
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    onFilesChange([]);
    setError(null);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop: handleFiles,
    accept: {
      'text/*': ['.txt', '.md', '.csv', '.json'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxSize,
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: disabled || uploadedFiles.length >= maxFiles
  });

  // Handle file rejections
  React.useEffect(() => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload text files or images.');
      } else {
        setError('File upload failed. Please try again.');
      }
    }
  }, [fileRejections, maxSize]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready';
      case 'error':
        return 'Failed';
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-300 font-semibold mb-1">Upload Error</h4>
              <p className="text-red-200/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragActive && !isDragReject
            ? 'border-blue-400/50 bg-blue-500/10 scale-105' 
            : isDragReject
            ? 'border-red-400/50 bg-red-500/10'
            : disabled || uploadedFiles.length >= maxFiles
            ? 'border-gray-600/30 bg-gray-700/20 cursor-not-allowed opacity-50'
            : 'border-gray-600/50 hover:border-gray-500/50 hover:bg-gray-700/30'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="relative">
          {/* Upload Icon with Animation */}
          <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragActive 
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-110' 
              : 'bg-gradient-to-r from-gray-600 to-gray-700'
          }`}>
            {isDragActive ? (
              <Cloud className="w-8 h-8 text-white animate-bounce" />
            ) : (
              <Upload className="w-8 h-8 text-white" />
            )}
          </div>
          
          {/* Upload Text */}
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">
              {isDragActive 
                ? 'Drop files here!' 
                : disabled || uploadedFiles.length >= maxFiles
                ? 'Upload limit reached'
                : 'Drop files or click to upload'
              }
            </h3>
            
            {!disabled && uploadedFiles.length < maxFiles && (
              <>
                <p className="text-gray-300">
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
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Supported: {acceptedTypes.join(', ')}</p>
                  <p>Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB • Max files: {maxFiles}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700/50 overflow-hidden">
          <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Uploaded Files ({uploadedFiles.length})</span>
            </h4>
            {uploadedFiles.length > 1 && (
              <button
                onClick={clearAllFiles}
                className="text-sm text-gray-400 hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between bg-gray-700/30 rounded-2xl p-4 border border-gray-600/30 transition-all duration-200 hover:bg-gray-700/50"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* File Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    uploadedFile.file.type.startsWith('image/')
                      ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                      : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                  }`}>
                    {getFileIcon(uploadedFile.file)}
                    <span className="text-white">
                      {getFileIcon(uploadedFile.file)}
                    </span>
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h5 className="text-white font-medium truncate">
                        {uploadedFile.file.name}
                      </h5>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(uploadedFile.status)}
                        <span className={`text-xs font-medium ${getStatusColor(uploadedFile.status)}`}>
                          {getStatusText(uploadedFile.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-400">
                        {(uploadedFile.file.size / 1024).toFixed(1)} KB
                      </span>
                      
                      {/* Progress Bar */}
                      {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                        <div className="flex-1 max-w-32">
                          <div className="w-full h-1.5 bg-gray-600/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-300"
                              style={{ width: `${uploadedFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={() => removeFile(uploadedFile.id)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                  disabled={uploadedFile.status === 'uploading' || uploadedFile.status === 'processing'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;