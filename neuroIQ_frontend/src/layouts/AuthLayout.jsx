import { Outlet } from 'react-router-dom';

/**
 * Layout for authentication pages (login, signup)
 * No sidebar, centered content
 */
const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-2xl">N</span>
              </div>
              <span className="text-3xl font-bold text-gray-900">NeuroIQ</span>
            </div>
          </div>

          {/* Content */}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
