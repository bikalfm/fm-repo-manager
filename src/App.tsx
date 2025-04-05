import React from 'react';
    import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
    import Layout from './components/Layout';
    // Updated imports to use folder index files
    import Dashboard from './pages/Dashboard';
    import Repositories from './pages/Repositories';
    import RepositoryDetail from './pages/RepositoryDetail';
    import Search from './pages/Search';
    import GoogleDrive from './pages/GoogleDrive';
    import Documents from './pages/Documents';
    import Settings from './pages/Settings';

    function App() {
      return (
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/repositories" element={<Repositories />} />
              {/* Keep wildcard route for nested paths */}
              <Route path="/repositories/:repositoryName/*" element={<RepositoryDetail />} />
              <Route path="/repositories/:repositoryName" element={<RepositoryDetail />} />
              <Route path="/search" element={<Search />} />
              <Route path="/drive" element={<GoogleDrive />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      );
    }

    export default App;
