import react from "@vitejs/plugin-react";
import { copyFile, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const copiedStaticFiles = [];

function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    async writeBundle() {
      const outDir = path.resolve("docs");
      await mkdir(outDir, { recursive: true });
      await Promise.all(
        copiedStaticFiles.map((file) =>
          copyFile(path.resolve(file), path.join(outDir, file)),
        ),
      );
      await cp(path.resolve("content"), path.join(outDir, "content"), {
        recursive: true,
      });
      await copyFile(
        path.join(outDir, "index.html"),
        path.join(outDir, "404.html"),
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/flash-cards/" : "/",
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  plugins: [react(), copyStaticAssets()],
}));
