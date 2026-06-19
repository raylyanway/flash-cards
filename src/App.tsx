import { AppInitializer } from "./components/AppInitializer";
import { AppContent } from "./components/AppContent";

export default function App() {
  return (
    <AppInitializer>
      <AppContent />
    </AppInitializer>
  );
}
