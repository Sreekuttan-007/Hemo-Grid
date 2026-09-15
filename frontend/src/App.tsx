import { AppProvider, useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { LandingPage } from './pages/LandingPage';

function AppRouter() {
  const { activeRoute } = useApp();

  if (activeRoute === '/landing') {
    return <LandingPage />;
  }

  return <Shell />;
}

export function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

export default App;
