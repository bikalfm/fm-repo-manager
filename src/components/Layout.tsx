import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, Search, HardDrive, FileText, Settings, Home, Menu, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Repositories', href: '/repositories', icon: Database },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Google Drive', href: '/drive', icon: HardDrive },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile menu */}
      <div className="lg:hidden">
        {/* Conditionally render the entire mobile menu structure */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setMobileMenuOpen(false)}
            ></div>

            {/* Sidebar */}
            <div
              className={`relative flex-1 flex flex-col max-w-xs w-full bg-black border-r border-gray-700 transition ease-in-out duration-300 transform ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full' // Keep transition classes
              }`}
            >
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <span className="text-white font-bold text-xl flex items-center">
                    
                    Final Moment
                  </span>
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                      onClick={() => setMobileMenuOpen(false)} // Close menu on navigation
                    >
                      <item.icon
                        className={`${
                          isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                        } mr-4 flex-shrink-0 h-6 w-6`}
                      />
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-700 bg-black">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <span className="text-white font-bold text-xl flex items-center">
                <FileText className="h-8 w-8 mr-2" />
                Final Moment
              </span>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-black space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <item.icon
                    className={`${
                      isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                    } mr-3 flex-shrink-0 h-6 w-6`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-black shadow-md shadow-gray-800">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={() => setMobileMenuOpen(true)} // Open the menu
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>
        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-full overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#111111',
            color: '#ffffff',
            border: '1px solid #333333'
          }
        }}
      />
    </div>
  );
};

export default Layout;
