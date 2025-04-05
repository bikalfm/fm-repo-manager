import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderPlus, RefreshCw, Database, Search as SearchIcon } from 'lucide-react'; // Added Database, SearchIcon
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { getRepositories, createRepository, deleteRepository } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // Import Link

const Repositories: React.FC = () => {
  const [repositories, setRepositories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRepositories();
      setRepositories(data.sort()); // Sort repositories alphabetically
    } catch (err) {
      setError('Failed to fetch repositories. Please check API connection.');
      toast.error('Failed to fetch repositories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    const trimmedName = newRepoName.trim();
    if (!trimmedName) {
      toast.error('Repository name is required');
      return;
    }
    // Basic validation for name (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
       toast.error('Invalid repository name. Use only letters, numbers, and underscores.');
       return;
    }
    if (repositories.includes(trimmedName)) {
      toast.error(`Repository "${trimmedName}" already exists.`);
      return;
    }


    setIsCreating(true);
    const toastId = toast.loading(`Creating repository "${trimmedName}"...`);
    try {
      await createRepository({
        name: trimmedName,
        description: newRepoDescription.trim() || undefined
      });
      toast.success(`Repository "${trimmedName}" created successfully`, { id: toastId });
      setIsCreateModalOpen(false);
      setNewRepoName('');
      setNewRepoDescription('');
      fetchRepositories(); // Refetch the list
    } catch (error) {
      toast.error(`Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      console.error("Create repository error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRepository = async () => {
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting repository "${selectedRepo}"...`);
    try {
      await deleteRepository(selectedRepo);
      toast.success(`Repository "${selectedRepo}" deleted successfully`, { id: toastId });
      setIsDeleteModalOpen(false);
      setSelectedRepo('');
      fetchRepositories(); // Refetch the list
    } catch (error) {
      toast.error(`Failed to delete repository: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
      console.error("Delete repository error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (repo: string) => {
    setSelectedRepo(repo);
    setIsDeleteModalOpen(true);
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
            onClick={fetchRepositories}
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={loading}
            title="Refresh repository list"
          >
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="h-4 w-4" />}
            title="Create a new repository"
          >
            New Repository
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : error ? (
         <Card>
           <p className="text-center text-red-400">{error}</p>
           <div className="mt-4 text-center">
             <Button onClick={fetchRepositories}>Retry</Button>
           </div>
         </Card>
      ) : repositories.length === 0 ? (
        <EmptyState
          title="No repositories found"
          description="Create a repository to start processing and searching documents."
          icon={<FolderPlus className="h-12 w-12" />} // Larger icon
          actionText="Create Repository"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {repositories.map((repo) => (
            // Added hoverEffect prop to Card
            <Card key={repo} hoverEffect={true}>
              <div className="flex flex-col h-full">
                {/* Top section with title and delete button */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center min-w-0">
                     <Database className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                     <h3 className="text-lg font-medium text-white truncate" title={repo}>{repo}</h3>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openDeleteModal(repo)}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="flex-shrink-0"
                    title={`Delete repository ${repo}`}
                  >
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>

                {/* Description or placeholder */}
                <p className="text-sm text-gray-400 flex-grow mb-4">
                  Manage files and search within this repository.
                  {/* Placeholder for description if available */}
                </p>

                {/* Action buttons at the bottom */}
                <div className="mt-auto flex justify-start space-x-3">
                  <Link to={`/repositories/${repo}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      title={`View files in ${repo}`}
                    >
                      View Files
                    </Button>
                  </Link>
                  <Link to={`/search?repository=${repo}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<SearchIcon className="h-4 w-4" />}
                      title={`Search within ${repo}`}
                    >
                      Search
                    </Button>
                  </Link>
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
              disabled={!newRepoName.trim() || isCreating || !/^[a-zA-Z0-9_]+$/.test(newRepoName.trim())}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="repo-name" className="block text-sm font-medium text-white mb-1">
              Repository Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="repo-name"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
              placeholder="e.g., medical_research"
              required
              disabled={isCreating}
              pattern="[a-zA-Z0-9_]+"
              title="Only letters, numbers, and underscores allowed."
            />
            <p className="mt-1 text-xs text-gray-400">
              Use only letters, numbers, and underscores. No spaces.
            </p>
          </div>
          <div>
            <label htmlFor="repo-description" className="block text-sm font-medium text-white mb-1">
              Description (Optional)
            </label>
            <textarea
              id="repo-description"
              value={newRepoDescription}
              onChange={(e) => setNewRepoDescription(e.target.value)}
              rows={3}
              className="block w-full border border-gray-700 rounded-md shadow-sm py-2 px-3 bg-gray-800 text-white focus:outline-none focus:ring-white focus:border-white sm:text-sm disabled:opacity-50"
              placeholder="Brief description of this repository's purpose"
              disabled={isCreating}
            />
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
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <div>
          <p className="text-sm text-gray-300">
            Are you sure you want to delete the repository <strong className="text-white">{selectedRepo}</strong>?
          </p>
          <p className="mt-2 text-sm text-red-400">
             This action cannot be undone and will permanently delete all associated files and vector data.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Repositories;
