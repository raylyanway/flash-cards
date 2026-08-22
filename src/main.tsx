import React from "react";
import { createRoot } from "react-dom/client";
import { AppInitializer } from "./components/AppInitializer";
import { App } from "./components/app/App";

import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppInitializer>
      <App />
    </AppInitializer>
  </React.StrictMode>,
);
