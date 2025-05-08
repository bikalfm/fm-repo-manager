import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderPlus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import { getRepositories, createRepository, deleteRepository } from '../../api';
import toast from 'react-hot-toast';

const DEFAULT_EMBEDDING_DIMENSION = 1536;
const DEFAULT_CHUNK_SIZE = 2000;
const DEFAULT_CHUNK_OVERLAP = 200;

const Repositories: React.FC = () => {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoEmbeddingDimension, setNewRepoEmbeddingDimension] = useState<number | string>(DEFAULT_EMBEDDING_DIMENSION);
  const [newRepoChunkSize, setNewRepoChunkSize] = useState<number | string>(DEFAULT_CHUNK_SIZE);
  const [newRepoChunkOverlap, setNewRepoChunkOverlap] = useState<number | string>(DEFAULT_CHUNK_OVERLAP);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getRepositories();
      setRepositories(data);
    } catch (error) {
      toast.error('Failed to fetch repositories');
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleCreateRepository = async () => {
    if (!newRepoName.trim()) {
      toast.error('Repository name is required');
      return;
    }
    const embeddingDimension = Number(newRepoEmbeddingDimension);
    const chunkSize = Number(newRepoChunkSize);
    const chunkOverlap = Number(newRepoChunkOverlap);

    if (isNaN(embeddingDimension) || embeddingDimension <= 0) {
      toast.error('Embedding dimension must be a positive number.');
      return;
    }
    if (isNaN(chunkSize) || chunkSize <= 0) {
      toast.error('Chunk size must be a positive number.');
      return;
    }
    if (isNaN(chunkOverlap) || chunkOverlap < 0) {
      toast.error('Chunk overlap must be a non-negative number.');
      return;
    }
    if (chunkOverlap >= chunkSize) {
      toast.error('Chunk overlap must be less than chunk size.');
      return;
    }


    setIsCreating(true);
    try {
      await createRepository({
        name: newRepoName.trim(),
        description: newRepoDescription.trim() || undefined,
        embedding_dimension: embeddingDimension,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      });
      toast.success(`Repository "${newRepoName}" created successfully`);
      setIsCreateModalOpen(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setNewRepoEmbeddingDimension(DEFAULT_EMBEDDING_DIMENSION);
      setNewRepoChunkSize(DEFAULT_CHUNK_SIZE);
      setNewRepoChunkOverlap(DEFAULT_CHUNK_OVERLAP);
      fetchRepositories(true); // Refresh after creating
    } catch (error) {
      toast.error('Failed to create repository');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRepository = async () => {
    setIsDeleting(true);
    try {
      await deleteRepository(selectedRepo);
      toast.success(`Repository "${selectedRepo}" deleted successfully`);
      setIsDeleteModalOpen(false);
      setSelectedRepo('');
      fetchRepositories(true); // Refresh after deleting
    } catch (error) {
      toast.error('Failed to delete repository');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (repo: string) => {
    setSelectedRepo(repo);
    setIsDeleteModalOpen(true);
  };

  const handleCardClick = (repoName: string) => {
    navigate(`/repositories/${repoName}`);
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-white sm:text-3xl sm:truncate">
            Repositories
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Button
            onClick={() => fetchRepositories(true)}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            New Repository
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner className="py-12" />
      ) : repositories.length === 0 ? (
        <EmptyState
          title="No repositories found"
          description="Create a repository to start processing and searching documents."
          icon={<FolderPlus className="h-8 w-8" />}
          actionText="Create Repository"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <Card key={repo} className="hover:shadow-lg hover:shadow-gray-700 transition-shadow cursor-pointer">
              <div onClick={() => handleCardClick(repo)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">{repo}</h3>
                    <p className="text-sm text-gray-400">Repository</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(repo);
                    }}
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete
                  </Button>
                </div>
                <div className="mt-4 flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                       e.stopPropagation();
                       handleCardClick(repo);
                    }}
                  >
                    View Files
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                     onClick={(e) => {
                       e.stopPropagation();
                       navigate(`/search?repository=${repo}`);
                    }}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Repository Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Repository"
        size="lg" // Increased size for more fields
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRepository}
              isLoading={isCreating}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium text-white">
              Repository Name
            </label>
            <input
              type="text"
              id="repo-name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              placeholder="e.g., medical_research"
            />
            <p className="mt-1 text-xs text-gray-400">
              Use only letters, numbers, and underscores. No spaces or special characters.
            </p>
          </div>
          <div>
            <label htmlFor="repo-description" className="block text-sm font-medium text-white">
              Description (Optional)
            </label>
            <textarea
              id="repo-description"
              value={newRepoDescription}
              onChange={(e) => setNewRepoDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
              placeholder="Brief description of this repository's purpose"
            />
          </div>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3">
            <div>
              <label htmlFor="repo-embedding-dimension" className="block text-sm font-medium text-white">
                Embedding Dimension
              </label>
              <input
                type="number"
                id="repo-embedding-dimension"
                value={newRepoEmbeddingDimension}
                onChange={(e) => setNewRepoEmbeddingDimension(e.target.value)}
                className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                placeholder={String(DEFAULT_EMBEDDING_DIMENSION)}
              />
              <p className="mt-1 text-xs text-gray-400">Default: {DEFAULT_EMBEDDING_DIMENSION}</p>
            </div>
            <div>
              <label htmlFor="repo-chunk-size" className="block text-sm font-medium text-white">
                Chunk Size
              </label>
              <input
                type="number"
                id="repo-chunk-size"
                value={newRepoChunkSize}
                onChange={(e) => setNewRepoChunkSize(e.target.value)}
                className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                placeholder={String(DEFAULT_CHUNK_SIZE)}
              />
              <p className="mt-1 text-xs text-gray-400">Default: {DEFAULT_CHUNK_SIZE}</p>
            </div>
            <div>
              <label htmlFor="repo-chunk-overlap" className="block text-sm font-medium text-white">
                Chunk Overlap
              </label>
              <input
                type="number"
                id="repo-chunk-overlap"
                value={newRepoChunkOverlap}
                onChange={(e) => setNewRepoChunkOverlap(e.target.value)}
                className="mt-1 block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm"
                placeholder={String(DEFAULT_CHUNK_OVERLAP)}
              />
              <p className="mt-1 text-xs text-gray-400">Default: {DEFAULT_CHUNK_OVERLAP}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Repository Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Repository"
        size="sm"
        footer={
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRepository}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete the repository <span className="font-semibold text-white">{selectedRepo}</span>? This action cannot be undone and will permanently delete all files and data associated with this repository.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Repositories;
