import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "app.js");
const promptPath = path.join(__dirname, "..", "src", "rrrr-system-message.txt");

const app = fs.readFileSync(appPath, "utf8");
const prompt = fs.readFileSync(promptPath, "utf8").trim();
const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

const startMarker = "const MEDICAL_PROMPT_WRITER_ADDON = ";
const endMarker = "const RRRR_SYSTEM_MESSAGE = MEDICAL_PROMPT_WRITER_ADDON;";

const startIdx = app.indexOf(startMarker);
const endIdx = app.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  throw new Error("Could not locate MEDICAL_PROMPT_WRITER_ADDON block in app.js");
}

const updated = `${app.slice(0, startIdx)}const MEDICAL_PROMPT_WRITER_ADDON = \`${escapedPrompt}\`;\n\n${app.slice(endIdx)}`;
fs.writeFileSync(appPath, updated, "utf8");
console.log("Patched MEDICAL_PROMPT_WRITER_ADDON (Prmt#2) in app.js");
