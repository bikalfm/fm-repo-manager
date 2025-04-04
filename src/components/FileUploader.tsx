import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';
import Button from './Button';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: Record<string, string[]>;
  maxSize?: number;
  className?: string;
  label?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  multiple = false,
  accept,
  maxSize = 10485760, // 10MB
  className = '',
  label = 'Upload files'
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject, fileRejections } = useDropzone({
    onDrop,
    multiple,
    accept,
    maxSize
  });

  const isFileTooLarge = fileRejections.length > 0 && fileRejections[0].file.size > maxSize;

  return (
    <div className={`w-full ${className}`}>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center w-full p-4 sm:p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive ? 'border-white bg-gray-800' : 'border-gray-600 hover:border-white hover:bg-gray-800'}
          ${isDragReject || isFileTooLarge ? 'border-red-400 bg-red-900/20' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-8 h-8 sm:w-10 sm:h-10 mb-3 ${isDragActive ? 'text-white' : 'text-gray-400'}`} />
          
          {isDragActive ? (
            <p className="text-white font-medium">Drop the files here...</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                {multiple ? 'Upload multiple files' : 'Upload a single file'}
              </p>
            </>
          )}
          
          {isDragReject && <p className="text-red-400 mt-2 text-sm">File type not accepted</p>}
          {isFileTooLarge && <p className="text-red-400 mt-2 text-sm">File is too large (max {maxSize / 1048576}MB)</p>}
        </div>
      </div>
      
      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          icon={<File className="w-4 h-4" />}
        >
          {label}
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
