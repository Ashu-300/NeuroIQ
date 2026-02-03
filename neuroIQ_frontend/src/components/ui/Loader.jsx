const Loader = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizes[size]}`}
      />
    </div>
  );
};

/**
 * Full page loader
 */
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader size="lg" />
  </div>
);

/**
 * Inline loader with text
 */
export const InlineLoader = ({ text = 'Loading...' }) => (
  <div className="flex items-center space-x-2 text-gray-600">
    <Loader size="sm" />
    <span>{text}</span>
  </div>
);

export default Loader;
