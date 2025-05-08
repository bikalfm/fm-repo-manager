import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { FileInfo } from '../types';
import { getFileBlob, downloadFile } from '../api'; // Assuming getFileBlob is added to api/index.ts
import { AlertTriangle, Download } from 'lucide-react';
import Button from './Button';

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

  useEffect(() => {
    if (isOpen && fileInfo && repositoryName) {
      setIsLoading(true);
      setContent(null);
      setError(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }

      getFileBlob(repositoryName, fileInfo.path)
        .then(async (blob) => {
          const contentType = fileInfo.content_type || blob.type;
          if (contentType.startsWith('text/')) {
            const textContent = await blob.text();
            setContent(textContent);
          } else if (contentType.startsWith('image/')) {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            setContent(url); // Store URL for img src
          } else if (contentType === 'application/pdf') {
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            setContent(url); // Store URL for iframe/object src
          } else {
            setError(`Preview is not available for this file type (${contentType}).`);
          }
        })
        .catch((err) => {
          console.error('Error fetching file content:', err);
          setError(`Failed to load file content: ${err.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    // Cleanup object URL on component unmount or when modal is closed/file changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileInfo, repositoryName]); // objectUrl removed from deps to avoid loop with its own cleanup

  const handleDownload = () => {
    if (repositoryName && fileInfo) {
      window.open(downloadFile(repositoryName, fileInfo.path), '_blank');
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }
    if (error) {
      return (
        <div className="p-4 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          {fileInfo && repositoryName && (
             <Button onClick={handleDownload} icon={<Download className="h-4 w-4"/>}>
                Download File
             </Button>
          )}
        </div>
      );
    }
    if (content && fileInfo) {
      const contentType = fileInfo.content_type || '';
      if (contentType.startsWith('text/')) {
        return <pre className="whitespace-pre-wrap break-all text-sm text-gray-300 p-2 bg-gray-800 rounded max-h-[60vh] overflow-auto">{content}</pre>;
      }
      if (contentType.startsWith('image/')) {
        return <img src={content} alt={fileInfo.name} className="max-w-full max-h-[60vh] object-contain mx-auto" />;
      }
      if (contentType === 'application/pdf') {
        // Using iframe for better compatibility and to avoid potential browser plugin issues with <object>
        return <iframe src={content} title={fileInfo.name} className="w-full h-[65vh] border-0" />;
      }
    }
    return <div className="p-4 text-center text-gray-500">No content to display or unsupported file type.</div>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fileInfo?.name || 'File Viewer'}
      size="xl" // Use a larger size for file content
    >
      <div className="min-h-[200px]"> {/* Ensure modal has some min height */}
         {renderContent()}
      </div>
    </Modal>
  );
};

export default FileViewerModal;
