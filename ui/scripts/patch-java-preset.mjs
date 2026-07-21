import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "app.js");
const promptPath = path.join(__dirname, "..", "src", "java-system-message.txt");

const app = fs.readFileSync(appPath, "utf8");
const prompt = fs.readFileSync(promptPath, "utf8").trim();
const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/`/g, "\\`");

const startMarker = "const JAVA_SYSTEM_MESSAGE = `";
const endMarker = "const JAVASCRIPT_SYSTEM_MESSAGE = `";

const startIdx = app.indexOf(startMarker);
const endIdx = app.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
  throw new Error("Could not locate JAVA_SYSTEM_MESSAGE block in app.js");
}

const javaPresetBlock = `  {
    value: "java",
    label: "Java",
    title: "Java / Spring Boot Backend Assistant",
    intro: "Java 17과 Spring Boot 3.x 기반 백엔드 개발 전문 채팅입니다. REST API, Controller·Service·Repository 계층 설계, JPA·DTO 분리, 전역 예외 처리, Spring Security, JUnit·MockMvc 테스트, 리팩토링, 오류 로그 분석을 실무 기준으로 지원합니다. 코드 작성은 바로 실행 가능한 코드를, 구조 질문은 패키지 설계와 장단점을 먼저 설명합니다.",
    prompt: JAVA_SYSTEM_MESSAGE
  },`;

let updated = `${app.slice(0, startIdx)}const JAVA_SYSTEM_MESSAGE = \`${escapedPrompt}\`;\n\n${app.slice(endIdx)}`;

if (!updated.includes('value: "java"')) {
  updated = updated.replace(
    /(\{\s*\n\s*value: "python",[\s\S]*?prompt: PYTHON_SYSTEM_MESSAGE\s*\n\s*\},)/,
    `$1\n${javaPresetBlock}`
  );
}

if (!updated.includes("title=${item.label}")) {
  updated = updated.replace(
    /(\s+)disabled=\$\{loading\}\n(\s+)>\n(\s+)\$\{item\.label\}/,
    `$1disabled=\${loading}\n$1title=\${item.label}\n$2>\n$3\${item.label}`
  );
}

fs.writeFileSync(appPath, updated, "utf8");
console.log("Patched app.js with Java preset");
