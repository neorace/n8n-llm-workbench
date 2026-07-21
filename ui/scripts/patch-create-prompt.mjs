import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "app.js");
const promptPath = path.join(__dirname, "..", "src", "create-system-message.txt");

const app = fs.readFileSync(appPath, "utf8");
const prompt = fs.readFileSync(promptPath, "utf8").trim();
const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

const startMarker = "const CREATE_SYSTEM_MESSAGE = `";
const endMarker = "const SYSTEM_PROMPTS = [";

const startIdx = app.indexOf(startMarker);
const endIdx = app.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  throw new Error("Could not locate CREATE_SYSTEM_MESSAGE block in app.js");
}

const updated = `${app.slice(0, startIdx)}const CREATE_SYSTEM_MESSAGE = \`${escapedPrompt}\`;\n\n${app.slice(endIdx)}`;
fs.writeFileSync(appPath, updated, "utf8");
console.log("Patched CREATE_SYSTEM_MESSAGE in app.js");
