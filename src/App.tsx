import { AppInitializer } from "./components/AppInitializer";
import { AppContent } from "./components/appContent/AppContent";

export default function App() {
  return (
    <AppInitializer>
      <AppContent />
    </AppInitializer>
  );
}
