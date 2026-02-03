const Card = ({ children, className = '', padding = 'md', hover = false }) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = [
    'bg-white rounded-xl shadow-sm border border-gray-100',
    paddings[padding],
    hover ? 'hover:shadow-md transition-shadow duration-200' : '',
    className,
  ].join(' ');

  return <div className={classes}>{children}</div>;
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b border-gray-100 pb-4 mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`border-t border-gray-100 pt-4 mt-4 ${className}`}>
    {children}
  </div>
);

export default Card;
