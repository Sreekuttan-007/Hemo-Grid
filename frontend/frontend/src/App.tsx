import { AppProvider } from './context/AppContext';
import { Shell } from './components/layout/Shell';

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

export default App;
