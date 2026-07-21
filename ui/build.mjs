import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(__dirname, "src", "app.js");
const defaultOutfile = path.join(
  __dirname,
  "..",
  "src",
  "main",
  "resources",
  "static",
  "app.js"
);
const outfile = process.env.MRS_UI_OUT_FILE
  ? path.resolve(process.env.MRS_UI_OUT_FILE)
  : defaultOutfile;
const outdir = path.dirname(outfile);
const entryName = path.basename(outfile, ".js");

fs.rmSync(outfile, { force: true });
fs.rmSync(path.join(outdir, "chunks"), { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  outdir,
  entryNames: entryName,
  chunkNames: "chunks/[name]-[hash]",
  bundle: true,
  format: "esm",
  splitting: true,
  platform: "browser",
  target: ["es2020"],
  loader: {
    ".txt": "text"
  },
  minify: true,
  legalComments: "none",
  logLevel: "info"
});

console.log(`Bundled UI -> ${outfile}`);
