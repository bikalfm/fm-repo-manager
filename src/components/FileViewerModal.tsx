import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { FileInfo } from '../types';
import { getFileBlob, downloadFile } from '../api'; 
import { AlertTriangle, Download } from 'lucide-react';
import Button from './Button';
import mammoth from 'mammoth';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInfo: FileInfo | null;
  repositoryName: string | null;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileInfo,
  repositoryName,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'text' | 'image' | 'pdf' | 'html' | 'unsupported'>('unsupported');

  useEffect(() => {
    if (isOpen && fileInfo && repositoryName) {
      setIsLoading(true);
      setContent(null);
      setError(null);
      setPreviewType('unsupported');
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }

      console.log('Attempting to fetch file:', {
        repositoryName,
        filePath: fileInfo.path,
        fileName: fileInfo.name,
        fullPath: fileInfo.path ? `${fileInfo.path}/${fileInfo.name}` : fileInfo.name
      });
      
      // Try both the stored path and the full path (path + filename)
      const filePathToTry = fileInfo.path ? `${fileInfo.path}/${fileInfo.name}` : fileInfo.name;
      
      getFileBlob(repositoryName, filePathToTry)
        .then(async (blob) => {
          console.log('File blob received:', { 
            size: blob.size, 
            type: blob.type, 
            fileName: fileInfo.name,
            path: fileInfo.path,
            repository: repositoryName
          });
          const effectiveContentType = fileInfo.content_type || blob.type;
          const fileName = fileInfo.name.toLowerCase();

          if (effectiveContentType.startsWith('text/')) {
            const textContent = await blob.text();
            setContent(textContent);
            setPreviewType('text');
          } else if (effectiveContentType.startsWith('image/')) {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            setContent(url); 
            setPreviewType('image');
          } else if (effectiveContentType === 'application/pdf' || fileName.endsWith('.pdf')) {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            setContent(url);
            setPreviewType('pdf');
          } else if (effectiveContentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              setContent(result.value);
              setPreviewType('html');
            } catch (docxError: any) {
              console.error('Error converting DOCX to HTML:', docxError);
              setError(`Failed to preview DOCX file: ${docxError.message}. You can try downloading it.`);
              setPreviewType('unsupported');
            }
          }
          else {
            setError(`Preview is not available for this file type (${effectiveContentType || 'unknown'}).`);
            setPreviewType('unsupported');
          }
        })
        .catch((err) => {
          console.error('Error fetching file content:', err);
          setError(`Failed to load file content: ${err.message}`);
          setPreviewType('unsupported');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileInfo, repositoryName]);

  const handleDownload = () => {
    if (repositoryName && fileInfo) {
      window.open(downloadFile(repositoryName, fileInfo.path), '_blank');
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full min-h-[300px]"><Spinner size="lg" /></div>;
    }
    if (error) {
      return (
        <div className="p-6 text-center flex flex-col justify-center items-center h-full min-h-[300px]">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <p className="text-lg text-gray-300 mb-6">{error}</p>
          {fileInfo && repositoryName && (
             <Button onClick={handleDownload} icon={<Download className="h-5 w-5"/>} variant="secondary">
                Download File
             </Button>
          )}
        </div>
      );
    }
    if (content && fileInfo) {
      switch (previewType) {
        case 'text':
          return <pre className="whitespace-pre-wrap break-all text-sm text-gray-300 p-4 bg-gray-800 rounded h-full overflow-auto">{content}</pre>;
        case 'image':
          return <div className="flex justify-center items-center h-full"><img src={content} alt={fileInfo.name} className="max-w-full max-h-full object-contain" /></div>;
        case 'pdf':
          return <iframe src={content} title={fileInfo.name} className="w-full h-full border-0" />;
        case 'html': // For DOCX converted to HTML
          return (
            <div 
              className="prose prose-sm md:prose-base prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded h-full overflow-auto" 
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          );
        default:
          // This case should ideally be caught by the error state, but as a fallback:
          return (
            <div className="p-6 text-center flex flex-col justify-center items-center h-full min-h-[300px]">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
              <p className="text-lg text-gray-300 mb-4">Preview not available for this file type.</p>
              {fileInfo && repositoryName && (
                 <Button onClick={handleDownload} icon={<Download className="h-5 w-5"/>} variant="secondary">
                    Download File
                 </Button>
              )}
            </div>
          );
      }
    }
    // Fallback if no content, error, or loading state is active
    return (
      <div className="p-6 text-center text-gray-500 flex justify-center items-center h-full min-h-[300px]">
        No content to display or unsupported file type.
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileInfo?.name || 'File Viewer'}
      size="almost-screen"
    >
      <div className="h-full flex flex-col bg-gray-850"> {/* Ensure content area takes full height */}
         {renderContent()}
      </div>
    </Modal>
  );
};

export default FileViewerModal;
