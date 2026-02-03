import { AuthProvider } from '../auth';

/**
 * Global providers wrapper
 */
const Providers = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

export default Providers;
