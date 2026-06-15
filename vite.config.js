import { copyFile, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const copiedStaticFiles = ["style.css", "favicon.svg"];

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

      await cp(path.resolve("cardsets"), path.join(outDir, "cardsets"), {
        recursive: true,
      });
    },
  };
}

export default defineConfig({
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
  plugins: [react(), copyStaticAssets()],
});
