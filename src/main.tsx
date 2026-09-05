import React from "react";
import { createRoot } from "react-dom/client";
import { AppInitializer } from "./app/AppInitializer";
import { App } from "./app/App";

import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppInitializer>
      <App />
    </AppInitializer>
  </React.StrictMode>,
);
