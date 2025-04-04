// API Response Types
export interface Repository {
  name: string;
  path?: string;
  created?: boolean;
  message?: string;
  embedding_dimension?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  created_at: string;
  modified_at: string;
  content_type: string | null;
}

export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  relevance_score: number;
  metadata: Record<string, any>;
}

export interface ContextResponse {
  query: string;
  chunks: DocumentChunk[];
  total_chunks: number;
  distance_metric_used: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  size: string;
  modified_time: string;
}

export interface DriveFolderContents {
  current_folder: DriveFolder | null;
  folders: DriveFolder[];
  files: DriveFile[];
}

export interface ProcessingStats {
  total_files: number;
  successful_files: number;
  failed_files: number;
  total_chunks: number;
  errors: Array<{ file: string; error: string }>;
}

export interface DriveProcessingStats {
  total_files_in_folder: number;
  files_processed: number;
  files_skipped: number;
  pdfs_processed: number;
  total_chunks_added: number;
  errors: Array<{ file: string; error: string }>;
}

export interface DriveImportResponse {
  success: boolean;
  message: string;
  files_imported: number;
  files_skipped: number;
  errors: Array<{ file: string; error: string }>;
}

export interface DriveSyncResponse {
  success: boolean;
  message: string;
  files_downloaded: number;
  files_skipped: number;
  errors: Array<{ file: string; error: string }>;
}

export interface DriveProcessingResponse {
  success: boolean;
  message: string;
  collection_name: string;
  stats: DriveProcessingStats;
}

// Request Types
export interface ContextRequest {
  query: string;
  max_chunks?: number;
  filter_metadata?: Record<string, any>;
}

export interface RepositoryCreateRequest {
  name: string;
  description?: string;
  embedding_dimension?: number;
}

export interface DriveProcessingRequest {
  folder_id: string;
  collection_name?: string;
  chunk_size?: number;
  chunk_overlap?: number;
}
