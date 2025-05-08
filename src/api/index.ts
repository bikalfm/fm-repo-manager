import axios from 'axios';
import {
  Repository,
  FileInfo,
  ContextRequest,
  ContextResponse,
  RepositoryCreateRequest,
  DriveFolder,
  DriveFolderContents,
  DriveProcessingRequest,
  DriveProcessingResponse,
  DriveImportResponse,
  DriveSyncResponse // Ensure this is imported
} from '../types';

// Define the fixed API URL
const FIXED_API_URL = 'https://fm-context-api-1022652397153.us-east1.run.app/';

// Get API URL
const getApiUrl = () => {
  return FIXED_API_URL;
};

// Create axios instance with dynamic baseURL
const createApiInstance = () => {
  return axios.create({
    baseURL: getApiUrl(),
  });
};

// Repository endpoints
export const getRepositories = async (): Promise<string[]> => {
  const api = createApiInstance();
  const response = await api.get('/repository/');
  return response.data;
};

export const createRepository = async (data: RepositoryCreateRequest): Promise<Repository> => {
  const api = createApiInstance();
  const response = await api.post('/repository/create', data);
  return response.data;
};

export const deleteRepository = async (name: string): Promise<any> => {
  const api = createApiInstance();
  const response = await api.delete(`/repository/${name}`);
  return response.data;
};

export const listRepositoryFiles = async (repository: string, path: string = ''): Promise<FileInfo[]> => {
  const api = createApiInstance();
  const response = await api.get(`/repository/${repository}/list`, {
    params: { path }
  });
  // console.log('API Response (listRepositoryFiles):', response.data); // Optional: Log file list data
  return response.data;
};

// New endpoint to get processed filenames
export const getProcessedFilenames = async (repository: string): Promise<string[]> => {
  const api = createApiInstance();
  try {
    const response = await api.get(`/repository/${repository}/filenames`);
    console.log(`API Response (getProcessedFilenames for ${repository}):`, response.data); // Log the raw response
    // Adjust based on the actual API response structure.
    // If it returns { filenames: [...] }
    if (response.data && Array.isArray(response.data.filenames)) {
      return response.data.filenames;
    }
    // If it returns just [...]
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback for unexpected structure
    console.warn('Unexpected response structure from /filenames endpoint:', response.data);
    return [];
  } catch (error) {
    console.error(`Error fetching processed filenames for ${repository}:`, error);
    // Re-throw or return empty array depending on desired error handling
    throw error; // Re-throw to allow calling function to handle it
  }
};

export const createFolder = async (repository: string, path: string): Promise<any> => {
  const api = createApiInstance();
  const response = await api.post(`/repository/${repository}/folder`, { path });
  return response.data;
};

export const deleteFolder = async (repository: string, path: string): Promise<any> => {
  const api = createApiInstance();
  const response = await api.delete(`/repository/${repository}/folder`, {
    params: { path }
  });
  return response.data;
};

// DEPRECATED: Use deleteFiles instead
export const deleteFile = async (repository: string, path: string): Promise<any> => {
  console.warn("deleteFile is deprecated. Use deleteFiles instead.");
  const api = createApiInstance();
  // Mimic the new endpoint's behavior for backward compatibility if needed,
  // but ideally, all calls should migrate to deleteFiles.
  const response = await api.post(`/repository/${repository}/delete-files`, {
    filenames: [path] // Send single path in an array
  });
  return response.data;
  // Original implementation (if needed for reference):
  // const response = await api.delete(`/repository/${repository}/file`, {
  //   params: { path }
  // });
  // return response.data;
};

// Updated endpoint to delete multiple files by filename (path)
export const deleteFiles = async (repository: string, filenames: string[]): Promise<any> => {
  const api = createApiInstance();
  // Use POST method and send filenames in the request body
  const response = await api.post(`/repository/${repository}/delete-files`, {
    filenames: filenames // The body should be { "filenames": ["path1", "path2"] }
  });
  return response.data;
};


export const downloadFile = (repository: string, path: string): string => {
  return `${getApiUrl()}/repository/${repository}/file/download?path=${encodeURIComponent(path)}`;
};

// Endpoint to process a file by its path (DEPRECATED - use processFilesByPath)
export const processFileByPath = async (repository: string, filePath: string, chunkSize: number = 2000, chunkOverlap: number = 200): Promise<any> => {
  console.warn("processFileByPath is deprecated. Use processFilesByPath instead.");
  const api = createApiInstance();
  const response = await api.post(`/repository/${repository}/process-files`, { // Updated endpoint
     file_paths: [filePath], // Send as a list
     chunk_size: chunkSize,
     chunk_overlap: chunkOverlap
   });
  return response.data;
};

// New endpoint to process multiple files by path
export const processFilesByPath = async (repository: string, filePaths: string[], chunkSize: number = 2000, chunkOverlap: number = 200): Promise<any> => {
  const api = createApiInstance();
  const response = await api.post(`/repository/${repository}/process-files`, {
     file_paths: filePaths,
     chunk_size: chunkSize,
     chunk_overlap: chunkOverlap
   });
  return response.data;
};

// New endpoint to upload a file without processing
export const uploadFile = async (repository: string, file: File, path: string = ''): Promise<any> => {
  const api = createApiInstance();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);

  const response = await api.post(`/repository/${repository}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};


// DEPRECATED: This endpoint uploads AND processes. Use uploadFile and processFilesByPath separately.
export const processFile = async (repository: string, file: File, path: string = '', chunkSize: number = 2000, chunkOverlap: number = 200): Promise<any> => {
  console.warn("processFile is deprecated. Use uploadFile and processFilesByPath instead.");
  const api = createApiInstance();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  formData.append('chunk_size', chunkSize.toString());
  formData.append('chunk_overlap', chunkOverlap.toString());

  const response = await api.post(`/repository/${repository}/process`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const processDirectory = async (repository: string, path: string = '', chunkSize: number = 2000, chunkOverlap: number = 200): Promise<any> => {
  const api = createApiInstance();
  const formData = new FormData();
  formData.append('path', path);
  formData.append('chunk_size', chunkSize.toString());
  formData.append('chunk_overlap', chunkOverlap.toString());

  const response = await api.post(`/repository/${repository}/process-directory`, formData);
  return response.data;
};

// Context endpoints
export const searchContext = async (query: string, repository?: string, maxChunks: number = 5, distanceMetric: string = 'cosine'): Promise<ContextResponse> => {
  const api = createApiInstance();
  const response = await api.get('/context/search', {
    params: {
      query,
      repository,
      max_chunks: maxChunks,
      distance_metric: distanceMetric
    }
  });
  return response.data;
};

export const getContext = async (request: ContextRequest, distanceMetric: string = 'cosine'): Promise<ContextResponse> => {
  const api = createApiInstance();
  const response = await api.post('/context/', request, {
    params: { distance_metric: distanceMetric }
  });
  return response.data;
};

export const getRepositoryContext = async (repository: string, request: ContextRequest, distanceMetric: string = 'cosine'): Promise<ContextResponse> => {
  const api = createApiInstance();
  const response = await api.post(`/context/repository/${repository}`, request, {
    params: { distance_metric: distanceMetric }
  });
  return response.data;
};

// Google Drive endpoints
export const getDriveFolders = async (): Promise<DriveFolder[]> => {
  const api = createApiInstance();
  const response = await api.get('/drive/folders');
  return response.data;
};

export const getDriveFolderContents = async (folderId: string = 'root'): Promise<DriveFolderContents> => {
  const api = createApiInstance();
  const response = await api.get('/drive/list', {
    params: { folder_id: folderId }
  });
  return response.data;
};

export const downloadDriveFile = (fileId: string): string => {
  return `${getApiUrl()}/drive/download/${fileId}`;
};

export const downloadDriveFolder = (folderId: string): string => {
  return `${getApiUrl()}/drive/download-folder/${folderId}`;
};

// Updated to use DriveSyncResponse
export const syncDriveToRepository = async (repository: string, overwrite: boolean = false): Promise<DriveSyncResponse> => {
  const api = createApiInstance();
  const response = await api.post(`/drive/sync/${repository}`, { overwrite });
  return response.data;
};

// Kept for reference, but not used by the primary "Sync" button anymore
export const importDriveToRepository = async (folderId: string, repository: string, overwrite: boolean = false): Promise<DriveImportResponse> => {
  const api = createApiInstance();
  const response = await api.post('/drive/import-to-repository', {
    folder_id: folderId,
    repository_name: repository,
    overwrite
  });
  return response.data;
};

export const processDriveFolder = async (request: DriveProcessingRequest): Promise<DriveProcessingResponse> => {
  const api = createApiInstance();
  const response = await api.post('/drive/process-folder', request);
  return response.data;
};

// Health check
export const checkHealth = async (): Promise<any> => {
  const api = createApiInstance();
  const response = await api.get('/health');
  return response.data;
};
