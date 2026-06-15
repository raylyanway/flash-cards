import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs");
const staticFiles = ["index.html", "style.css", "favicon.svg"];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function copyFile(filePath, destDir) {
  await ensureDir(destDir);
  await fs.promises.copyFile(path.join(root, filePath), path.join(destDir, filePath));
}

async function copyRecursive(src, dest) {
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  await ensureDir(dest);

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function run() {
  await ensureDir(outDir);

  const buildOptions = {
    entryPoints: [path.join(root, "src/app.ts")],
    bundle: true,
    outfile: path.join(outDir, "app.js"),
    minify: false,
    sourcemap: false,
    platform: "browser",
    format: "esm",
    target: ["es2020"],
  };

  if (process.argv.includes("--watch")) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("Watching sources and rebuilding to docs/...");
  } else {
    await esbuild.build(buildOptions);
    console.log("Built docs/app.js");
  }

  for (const file of staticFiles) {
    await copyFile(file, outDir);
  }

  const cardsetsSrc = path.join(root, "cardsets");
  const cardsetsDest = path.join(outDir, "cardsets");
  await copyRecursive(cardsetsSrc, cardsetsDest);
  console.log("Copied static assets to docs/");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
