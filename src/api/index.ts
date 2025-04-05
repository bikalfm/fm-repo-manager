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

    // Get API URL from localStorage if available, otherwise use environment variable or default
    const getApiUrl = () => {
      return localStorage.getItem('apiUrl') || import.meta.env.VITE_API_URL || 'https://finalmoment-context-api-1022652397153.us-central1.run.app';
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
      return response.data;
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

    export const deleteFile = async (repository: string, path: string): Promise<any> => {
      const api = createApiInstance();
      const response = await api.delete(`/repository/${repository}/file`, {
        params: { path }
      });
      return response.data;
    };

    export const downloadFile = (repository: string, path: string): string => {
      return `${getApiUrl()}/repository/${repository}/file/download?path=${encodeURIComponent(path)}`;
    };

    export const processFile = async (repository: string, file: File, path: string = '', chunkSize: number = 2000, chunkOverlap: number = 200): Promise<any> => {
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
