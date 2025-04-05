import React, { useState, useEffect } from 'react';
    import { Plus, Trash2, FolderPlus, RefreshCw } from 'lucide-react';
    import Card from '../../components/Card'; // Adjusted import path
    import Button from '../../components/Button'; // Adjusted import path
    import Modal from '../../components/Modal'; // Adjusted import path
    import EmptyState from '../../components/EmptyState'; // Adjusted import path
    import Spinner from '../../components/Spinner'; // Adjusted import path
    import { getRepositories, createRepository, deleteRepository } from '../../api'; // Adjusted import path
    import toast from 'react-hot-toast';

    const Repositories: React.FC = () => {
      const [repositories, setRepositories] = useState<string[]>([]);
      const [loading, setLoading] = useState(true); // Keep track of initial load
      const [isRefreshing, setIsRefreshing] = useState(false); // For refresh button
      const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
      const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
      const [selectedRepo, setSelectedRepo] = useState('');
      const [newRepoName, setNewRepoName] = useState('');
      const [newRepoDescription, setNewRepoDescription] = useState('');
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

        setIsCreating(true);
        try {
          await createRepository({
            name: newRepoName.trim(),
            description: newRepoDescription.trim() || undefined
          });
          toast.success(`Repository "${newRepoName}" created successfully`);
          setIsCreateModalOpen(false);
          setNewRepoName('');
          setNewRepoDescription('');
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
                onClick={() => fetchRepositories(true)} // Pass true for refresh
                variant="secondary"
                icon={<RefreshCw className="h-4 w-4" />}
                isLoading={isRefreshing} // Use isRefreshing state
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
            <Spinner className="py-12" /> // Use Spinner component
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
                <Card key={repo} className="hover:shadow-lg hover:shadow-gray-700 transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-1">{repo}</h3>
                      <p className="text-sm text-gray-400">Repository</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openDeleteModal(repo)}
                      icon={<Trash2 className="h-4 w-4" />}
                      // Add isLoading state if needed for individual delete buttons,
                      // but the modal button already handles it.
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/repositories/${repo}`}
                    >
                      View Files
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = `/search?repository=${repo}`}
                    >
                      Search
                    </Button>
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
                  isLoading={isCreating} // Use isLoading prop
                >
                  Create
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
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
                  isLoading={isDeleting} // Use isLoading prop
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
