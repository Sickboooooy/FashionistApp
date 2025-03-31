import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { OutfitProvider } from "./contexts/outfit-context";
import { PreferencesProvider } from "./contexts/preferences-context";

createRoot(document.getElementById("root")!).render(
  <OutfitProvider>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </OutfitProvider>
);
