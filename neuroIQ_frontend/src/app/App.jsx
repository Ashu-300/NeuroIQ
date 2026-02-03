import Providers from './Providers';
import Router from './Router';
import ErrorBoundary from './ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <Providers>
        <Router />
      </Providers>
    </ErrorBoundary>
  );
};

export default App;
