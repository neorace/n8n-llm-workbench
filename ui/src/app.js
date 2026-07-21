import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { marked } from "marked";
import DOMPurify from "dompurify";
import GENERAL_SYSTEM_MESSAGE_TEXT from "./general-system-message.txt";
import PYTHON_SYSTEM_MESSAGE_TEXT from "./python-system-message.txt";
import JAVA_SYSTEM_MESSAGE_TEXT from "./java-system-message.txt";
import CREATE_SYSTEM_MESSAGE_TEXT from "./create-system-message.txt";
import RRRR_SYSTEM_MESSAGE_TEXT from "./rrrr-system-message.txt";
import RAG_SYSTEM_MESSAGE_TEXT from "./rag-system-message.txt";
import N8N_CODE_SYSTEM_MESSAGE_TEXT from "./n8n-code-system-message.txt";

const html = htm.bind(React.createElement);

function renderMarkdown(text) {
  const source = typeof text === "string" ? text : String(text ?? "");
  const rawHtml = marked.parse(source, { gfm: true, breaks: true });
  return DOMPurify.sanitize(rawHtml);
}

function messageHasCodeBlock(text) {
  return /```[\s\S]*?```/.test(String(text ?? ""));
}

function looksLikeCreatePromptOutput(text) {
  const source = String(text ?? "");
  return (
    /#\s*Character\s*\(캐릭터\)/i.test(source) &&
    /#\s*Request\s*\(요청\)/i.test(source) &&
    /#\s*Examples\s*\(예시\)/i.test(source) &&
    /#\s*Adjustment/i.test(source) &&
    /#\s*Type\s*of\s*Output\s*\(출력\s*형태\)/i.test(source) &&
    /#\s*Explanation\s*\(설명\s*정책\)/i.test(source)
  );
}

function looksLikeLegacyPromptOutput(text) {
  const source = String(text ?? "");
  const hasRole = /#\s*Role(\s*\([^)]*\))?/i.test(source);
  const hasRequest = /#\s*Request(\s*\([^)]*\))?/i.test(source);
  const hasRequirements = /#\s*Requirements(\s*\([^)]*\))?/i.test(source);
  const hasResponse = /#\s*Response(\s*\([^)]*\))?/i.test(source);
  return hasRole && hasRequest && hasRequirements && hasResponse;
}

function looksLikeSystemPromptOutput(text) {
  return looksLikeCreatePromptOutput(text) || looksLikeLegacyPromptOutput(text);
}

function extractMarkdownCodeBlock(source, lang = "markdown") {
  const pattern = new RegExp(`\`\`\`${lang}\\s*\\n([\\s\\S]*?)\\n\`\`\``, "i");
  const match = String(source ?? "").match(pattern);
  return match ? match[1].trim() : "";
}

function extractSystemPromptOutput(text) {
  const source = String(text ?? "").trim();
  if (!looksLikeSystemPromptOutput(source)) return source;

  const markdownBlock = extractMarkdownCodeBlock(source, "markdown");
  if (markdownBlock && looksLikeCreatePromptOutput(markdownBlock)) {
    return markdownBlock;
  }

  const startMatch =
    source.match(/#\s*Character\s*\(캐릭터\)/i) || source.match(/#\s*Role\s*\(역할\)/i);
  if (!startMatch || startMatch.index == null) return source;

  let extracted = source.slice(startMatch.index).trim();
  const exampleSection = findOutputExampleSection(source);
  if (exampleSection && !extracted.includes(exampleSection)) {
    extracted = `${extracted}\n\n${exampleSection}`;
  }
  return extracted;
}

function findOutputExampleSection(source) {
  const match = String(source ?? "").match(
    /(^|\n)(#{1,2}\s*출력\s*예시[^\n]*[\s\S]*?)(?=\n#\s*(?:Role|Character)\s*\(|$)/i
  );
  return match ? match[2].trim() : "";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSystemPromptBlockHtml(text) {
  const source = String(text ?? "");
  return `<div class="code-block system-prompt-output-block"><pre><code class="language-plaintext">${escapeHtml(source)}</code></pre></div>`;
}

function normalizePromptAnswer(text) {
  const source = String(text ?? "").trim();
  const blockMatch = source.match(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n```/);
  if (blockMatch) {
    return blockMatch[1].trim();
  }
  return source;
}

function buildAssistantHtml(text, preset) {
  const source = String(text ?? "").trim();
  if (looksLikeSystemPromptOutput(source) || (preset === "prompt-rrrr" && /#\s*Role\b/i.test(source))) {
    return renderSystemPromptBlockHtml(
      looksLikeSystemPromptOutput(source) ? normalizePromptAnswer(source) : source
    );
  }
  return renderMarkdown(source);
}

const CHAT_INPUT_MIN_HEIGHT = 44;
const CHAT_INPUT_MAX_HEIGHT = 400;
const LARGE_CHAT_INPUT_CHARS = 20000;

function countTextLines(text) {
  const source = String(text ?? "");
  if (!source) return 0;
  let lines = 1;
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) lines += 1;
  }
  return lines;
}

function autoResizeChatInput(textarea) {
  if (!textarea) return;
  const length = textarea.value?.length ?? 0;
  // Measuring scrollHeight for huge pasted text can freeze the browser.
  if (length > LARGE_CHAT_INPUT_CHARS) {
    textarea.style.height = `${CHAT_INPUT_MAX_HEIGHT}px`;
    return;
  }
  textarea.style.height = "auto";
  const nextHeight = Math.min(
    Math.max(textarea.scrollHeight, CHAT_INPUT_MIN_HEIGHT),
    CHAT_INPUT_MAX_HEIGHT
  );
  textarea.style.height = `${nextHeight}px`;
}

function isChatScrolledToBottom(element, threshold = 48) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

function scrollChatToBottom(chatArea, force = false) {
  if (!chatArea) return;
  if (force || isChatScrolledToBottom(chatArea)) {
    chatArea.scrollTop = chatArea.scrollHeight;
  }
}

const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

async function copyText(value) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (e) {
    // fall back below
  }
  try {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(helper);
    return ok;
  } catch (e) {
    return false;
  }
}

function attachCopyButton(wrapper, rawCode, options = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "code-copy-btn";
  button.title = options.title ?? "복사";
  button.setAttribute("aria-label", options.ariaLabel ?? "코드 복사");
  button.innerHTML = `${COPY_ICON_SVG}<span class="code-copy-label">복사</span>`;

  button.addEventListener("click", async () => {
    const value = typeof options.getText === "function" ? options.getText() : rawCode;
    const ok = await copyText(value);
    if (!ok) return;
    button.classList.add("is-copied");
    button.innerHTML = `${CHECK_ICON_SVG}<span class="code-copy-label">복사됨</span>`;
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.innerHTML = `${COPY_ICON_SVG}<span class="code-copy-label">복사</span>`;
    }, 1500);
  });

  wrapper.appendChild(button);
}

function MessageCopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  return html`
    <button
      type="button"
      className=${`message-copy-btn${copied ? " is-copied" : ""}`}
      title="복사"
      aria-label="메시지 복사"
      onClick=${async (event) => {
        event.stopPropagation();
        const ok = await copyText(String(text ?? ""));
        if (!ok) return;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      <span
        className="message-copy-icon"
        dangerouslySetInnerHTML=${{ __html: copied ? CHECK_ICON_SVG : COPY_ICON_SVG }}
      ></span>
      <span className="message-copy-label">${copied ? "복사됨" : "복사"}</span>
    </button>
  `;
}

function mountSystemPromptCopyButton(wrapper, getText) {
  if (!wrapper) return;

  const existing = wrapper.querySelector(".code-copy-btn");
  if (existing) existing.remove();

  attachCopyButton(wrapper, "", {
    getText,
    title: "시스템 프롬프트 복사",
    ariaLabel: "시스템 프롬프트 복사"
  });
}

const SHIKI_THEME = "dark-plus";
const SHIKI_LANGS = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "python",
  "java",
  "json",
  "bash",
  "shell",
  "sql",
  "xml",
  "html",
  "css",
  "yaml",
  "properties",
  "ini",
  "toml",
  "markdown",
  "diff",
  "plaintext"
];

const LANG_ALIASES = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  py: "python",
  python: "python",
  java: "java",
  json: "json",
  jsonc: "json",
  sh: "bash",
  shell: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  xml: "xml",
  html: "html",
  css: "css",
  yml: "yaml",
  yaml: "yaml",
  properties: "properties",
  ini: "ini",
  toml: "toml",
  md: "markdown",
  markdown: "markdown",
  diff: "diff"
};

let highlighterPromise = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki")
      .then(({ createHighlighter }) =>
        createHighlighter({
          themes: [SHIKI_THEME],
          langs: SHIKI_LANGS
        })
      )
      .catch((e) => {
        highlighterPromise = null;
        throw e;
      });
  }
  return highlighterPromise;
}

function detectLanguage(codeEl) {
  if (!codeEl) return "plaintext";
  const match = (codeEl.className || "").match(/language-([\w-]+)/i);
  const raw = match ? match[1].toLowerCase() : "";
  return LANG_ALIASES[raw] || "plaintext";
}

async function decorateCodeBlocks(container) {
  if (!container) return;
  const blocks = Array.from(container.querySelectorAll(".markdown-body pre"));

  const pending = [];
  blocks.forEach((pre) => {
    const parent = pre.parentElement;
    if (parent && parent.classList.contains("code-block")) {
      // Whole-message copy button already covers system prompt outputs.
      if (parent.classList.contains("system-prompt-output-block")) {
        const existing = parent.querySelector(":scope > .code-copy-btn");
        if (existing) existing.remove();
        return;
      }
      ensureCodeCopyButton(parent, pre);
      return;
    }
    const codeEl = pre.querySelector("code");
    const rawCode = (codeEl ? codeEl.textContent : pre.textContent) ?? "";
    const lang = detectLanguage(codeEl);

    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    ensureCodeCopyButton(wrapper, pre);

    pending.push({ wrapper, pre, rawCode, lang });
  });

  if (pending.length === 0) return;

  let highlighter;
  try {
    highlighter = await getHighlighter();
  } catch (e) {
    return; // keep plain code blocks if highlighting cannot load
  }

  pending.forEach(({ wrapper, pre, rawCode, lang }) => {
    if (!wrapper.isConnected || !wrapper.contains(pre)) return;
    try {
      const highlightedHtml = highlighter.codeToHtml(rawCode, {
        lang,
        theme: SHIKI_THEME
      });
      const temp = document.createElement("div");
      temp.innerHTML = highlightedHtml;
      const newPre = temp.querySelector("pre");
      if (newPre) {
        wrapper.replaceChild(newPre, pre);
      }
    } catch (e) {
      // keep the original plain code block
    }
    ensureCodeCopyButton(wrapper, wrapper.querySelector("pre"));
  });
}

function ensureCodeCopyButton(wrapper, pre) {
  if (!wrapper) return;
  const existing = wrapper.querySelector(":scope > .code-copy-btn");
  if (existing) existing.remove();

  const codeEl = pre?.querySelector?.("code");
  const rawCode = (codeEl ? codeEl.textContent : pre?.textContent) ?? "";
  const isSystemPrompt = wrapper.classList.contains("system-prompt-output-block");
  attachCopyButton(wrapper, rawCode, {
    title: isSystemPrompt ? "시스템 프롬프트 복사" : "복사",
    ariaLabel: isSystemPrompt ? "시스템 프롬프트 복사" : "코드 복사",
    getText: () => {
      const liveCode = wrapper.querySelector("pre code");
      return (
        (liveCode ? liveCode.textContent : wrapper.querySelector("pre")?.textContent) ?? rawCode
      );
    }
  });
}
const DEFAULT_MODEL_OPTIONS = [
  { label: "google-gemma4-E4B", value: "google-gemma4-E4B" },
  { label: "Qwen3-30B-A3B", value: "Qwen3-30B-A3B" },
  { label: "Qwen3-30B-coder", value: "qwen3-coder" }
];
const SESSION_KEY_PREFIX = "mrs-chat-sessionid";
const CHAT_MODES = [
  { value: "test", label: "테스트" },
  { value: "service", label: "서비스" }
];
const RAG_FILE_ACCEPT = ".txt,.text,.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff";
const RAG_MAX_FILES = 3;
const RAG_DEFAULT_DOC_TYPE = "auto";
const RAG_TABLE_NAME_PREFIX = "tbl_vec_";
const RAG_TABLE_NAME_HINT =
  "벡터 테이블명은 반드시 본인만 사용하는 고유한 이름으로 지정해야 합니다. 타인과 동일한 이름을 쓰면 검색 데이터가 섞이거나 기존 데이터가 덮어씌워질 수 있으니 주의해 주세요.";
const RAG_CHAT_PRESET = "rag";
const RAG_CHAT_TITLE = "Retrieval-Augmented Generation";
const RAG_CHAT_INTRO =
  "RAG 전용 채팅 세션입니다. 좌측에서 문서를 업로드하고 벡터DB를 생성한 뒤 질의하세요.";
const RAG_SYSTEM_MESSAGE = RAG_SYSTEM_MESSAGE_TEXT;

function normalizeRagDocType(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed || RAG_DEFAULT_DOC_TYPE;
}

function resolveRagTableName(value) {
  const suffix = String(value ?? "").trim();
  if (!suffix) {
    return "";
  }
  if (suffix.startsWith(RAG_TABLE_NAME_PREFIX)) {
    return suffix;
  }
  return `${RAG_TABLE_NAME_PREFIX}${suffix}`;
}

function normalizeModelOptions(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      label: String(item?.label ?? "").trim(),
      value: String(item?.value ?? "").trim()
    }))
    .filter((item) => item.label && item.value);
}

function isRagAllowedFile(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".text")) {
    return true;
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return true;
  }
  return mime.startsWith("image/");
}

function isSameRagFile(left, right) {
  if (!left || !right) return false;
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified &&
    left.type === right.type
  );
}
const DEFAULT_SYSTEM_MESSAGE = `# [R1] ROLE — 역할 정의

너는 가톨릭중앙의료원 산하 및 국내 주요 종합병원의 의료 IT를 선도하는
'평화이즈(Pyeonghwa IS)'의 20년 경력 상급 기술지원 AI 엔지니어이다.

페르소나 특성:
- 직함: 시니어 솔루션 아키텍트 / 기술지원 수석 엔지니어
- 핵심 전문 도메인: 병원정보시스템(HIS), 전자의무기록(EMR), 처방전달시스템(OCS)
- 보유 솔루션 지식: 통합의료정보시스템 'nU(앤유)' 패키지 (OCS/EMR, 간호, BSS 등)
- 성격: 확신에 차고 간결하며, 노련하고 여유로운 베테랑 엔지니어
- 범용성: 의료 IT 외 일반 IT(인프라/개발/아키텍처), 일상 상식, 날씨,
          일반 대화 등 모든 주제에 막힘없이 유연하게 대응한다.
- 모델 정체성: 기반 모델·버전·제조사 등 기술적 신원에 관한 질문을
               받으면 숨기거나 회피하지 않고 아는 대로 솔직하게 답한

# [R2] REQUIREMENTS — 핵심 수행 요건

## 2-1. 도메인 지식 기반
- 기관코드(INSTCD), 환자등록번호(PID) 등 마스터 데이터의 무결성과
  보안을 최우선 가치로 다룬다.
- nU 솔루션 패키지의 모듈 구조(OCS/EMR/간호/BSS)와 연계 관계를
  기반으로 분석·조언한다.

## 2-2. 대화 유형별 대응 방식

### [일반 질문 / 일상 대화]
- 주제가 의료·IT와 무관해도 정확하고 친절하게 답변한다.
- 답변 후 자연스러운 흐름으로 대화를 이어간다.
- 시니어 엔지니어 특유의 정중하고 여유로운 어조를 유지한다.

### [기술 분석 요청 (에러 로그 / JSON / n8n 설정 / 시스템 장애 등)]
- 다음 3단계 구조로 답변한다:
  ① [원인 분석]   → 문제의 근본 원인을 다각도로 진단
  ② [해결 가이드] → 실무 적용 가능한 구체적 해결 방향 제시
  ③ [적용 샘플]   → 설정값·명령어·데이터 예시를 코드 블록(\`\`\`)으로 제공

# [R3] RESTRICTIONS — 금지 및 제한 사항

## 절대 금지
- ❌ "제 도메인 밖입니다", "답변 드리기 어렵습니다" 등의 거절 금지
  → 의료·IT 외 모든 질문에도 반드시 성실히 답변한다.
- ❌ 확인되지 않은 병원별 로컬 마스터 코드(Local Code) 단정 금지
- ❌ 시스템 내부 보안 규정에 대한 임의 확답 금지

## 불확실 영역 처리 원칙
- 확답이 불가한 항목(보안 정책, 기관 고유 코드 등)에 대해서는
  아래 안내 문구를 사용한다:
  → "해당 사항은 운영 담당 파트 및 관리자(DBA)와의
     교차 검증이 필요합니다."

# [R4] RESPONSE — 출력 형식 및 톤 규칙

## 4-1. 톤 & 매너
- 20년 경력 아키텍트답게 전문적·간결·확신에 찬 어조를 유지한다.
- 불필요한 서론("안녕하세요", "좋은 질문입니다" 등) 생략한다.
- 단정할 수 없는 영역은 "교차 검증 필요" 문구로 명확히 선을 긋는다.

## 4-2. 대화 유형별 출력 형식

### 일반 대화
- 규격화된 틀 없이 질문 맥락에 맞는 유연한 대화체로 작성한다.
- 짧고 명료하게, 필요 시 자연스럽게 후속 대화를 유도한다.

### 기술 분석
- 아래 3단계 구조를 반드시 준수한다. 서론·결론 불필요.`;

const PROMPT_WRITER_REQUEST_GATE = `[프롬프트 생성 요청 판별 — 최우선]

시스템 프롬프트를 새로 작성(생성)하는 것은 사용자가 **명시적으로 프롬프트 생성을 요청한 경우에만** 수행한다.
업무 설명, 도메인 설명, 질문, 상담, 아이디어 나열만으로는 프롬프트를 만들지 않는다.

프롬프트 생성 요청으로 인정하는 경우 (띄어쓰기·오타·대소문자 허용):
- "프롬프트 만들어", "프롬프트 만들어줘", "프롬프트 작성해줘", "프롬프트 생성", "프롬프트 생성해줘"
- "프롬포트 생성", "프롬포트 만들어" 등 프롬포트 오타 변형
- "prompt", "prompt 만들어", "make prompt", "create prompt", "write prompt"
- 위 표현이 문장 안에 포함된 경우 (예: "의료용 프롬프트 만들어줘", "RRRR prompt 작성해")

프롬프트 생성 요청이 **아닌** 경우:
- 목적·업무·도메인만 설명하고 생성 요청 표현이 없는 경우
- 프롬프트 분석, 평가, 수정, 개념 설명, 일반 질문·대화
- "프롬프트" 단어만 있고 만들어 달라는 의도가 없는 경우

프롬프트 생성 요청이 **아닐 때**:
- CREATE/RRRR 구조의 시스템 프롬프트 본문을 출력하지 **않는다**.
- 코드블록 하나로 프롬프트를 감싸 출력하지 **않는다**.
- 일반 답변 형식으로 대화·설명·질문에 응답한다.
- 필요하면 "프롬프트를 만들어 달라"고 요청하면 작성해 줄 수 있다고 **짧게 안내**할 수 있다.

프롬프트 생성 요청이 **있을 때만**:
- 아래 규칙에 따라 시스템 프롬프트를 작성·출력한다.
- 사용자가 함께 제공한 목적·도메인·요구사항을 반영한다.`;

// Prmt#2 RRRR system prompt is loaded from ./rrrr-system-message.txt.

// Python system prompt is loaded from ./python-system-message.txt.

// Java system prompt is loaded from ./java-system-message.txt.

// n8n Code system prompt is loaded from ./n8n-code-system-message.txt.

const JAVASCRIPT_SYSTEM_MESSAGE = N8N_CODE_SYSTEM_MESSAGE_TEXT;

// General system prompt is loaded from ./general-system-message.txt.

// Prmt#1 CREATE system prompt is loaded from ./create-system-message.txt.

const SYSTEM_PROMPTS = [
  {
    value: "general",
    label: "일반",
    title: "General AI Assistant",
    intro: "범용 AI 어시스턴트 채팅입니다. 일반 질문, 일상 대화, 업무 상담, 문서 요약·작성, 아이디어 발상, 글쓰기·번역·자료 정리, 간단한 업무 자동화 아이디어 등 폭넓은 주제에 답변합니다. 코딩이 아닌 일반 질문도 환영합니다. 설명은 이해하기 쉽게, 답변은 바로 활용할 수 있도록 실용적으로 제공합니다. 복잡한 내용도 단계별로 정리해 드리니 편하게 질문해 주세요.",
    prompt: GENERAL_SYSTEM_MESSAGE_TEXT
  },
  {
    value: "javascript",
    label: "n8n Code",
    title: "n8n JavaScript Code Assistant",
    intro: "n8n 워크플로우 자동화용 JavaScript 코드 전문 채팅입니다. Code/Function 노드용 코드 작성·수정·리뷰·디버깅, JSON·배열 데이터 변환, 병원·업무 데이터 가공, LLM 연동 변환, 에러 처리까지 n8n 실무 규칙에 맞춰 지원합니다. 반환 구조·null 안전·문자열 처리 규칙을 지키며, 노드에 바로 붙여 실행할 수 있는 코드를 제공합니다.",
    prompt: JAVASCRIPT_SYSTEM_MESSAGE
  },
  {
    value: "python",
    label: "Python",
    title: "Python / LLM Application Assistant",
    intro: "Python과 LLM 애플리케이션 개발 전문 채팅입니다. LangChain, LangGraph, RAG, Agent, Tool Calling, PromptTemplate, Vector DB·Embedding 연동 코드 작성·디버깅·리팩토링을 지원합니다. 필요 패키지 설치부터 실행·테스트 방법까지 실무형으로 안내하며, 바로 실행 가능한 코드를 제공합니다.",
    prompt: PYTHON_SYSTEM_MESSAGE_TEXT
  },
  {
    value: "java",
    label: "Java",
    title: "Java / Spring Boot Backend Assistant",
    intro: "Java 17·Spring Boot 3.x 백엔드 개발 전문 채팅입니다. REST API, Controller·Service·Repository 계층 설계, JPA·DTO 분리, 전역 예외 처리, Spring Security, JUnit 테스트, 리팩토링, 오류 분석을 실무 기준으로 지원합니다. 코드는 바로 실행 가능하게, 구조 질문은 패키지 설계와 장단점을 먼저 설명합니다.",
    prompt: JAVA_SYSTEM_MESSAGE_TEXT
  },
  {
    value: "prompt-create",
    label: "Prmt#1",
    title: "CREATE Prompt Writer",
    intro: "CREATE 포맷 시스템 프롬프트 작성 전문 채팅입니다. Character·Request·Examples·Adjustment·Type of Output·Explanation 6섹션으로 메타 프롬프트를 설계합니다. 「프롬프트 만들어」「프롬프트 생성」「prompt」처럼 생성을 요청할 때만 프롬프트를 작성하며, 그 외에는 일반 대화·설명·상담으로 응답합니다.",
    prompt: CREATE_SYSTEM_MESSAGE_TEXT
  },
  {
    value: "prompt-rrrr",
    label: "Prmt#2",
    title: "RRRR Prompt Writer",
    intro: "RRRR(Role·Request·Requirements·Response) 4단 구조 시스템 프롬프트 작성 전문 채팅입니다. 「프롬프트 만들어」「프롬프트 생성」「prompt」처럼 생성을 요청할 때만 프롬프트를 작성하며, 그 외에는 일반 대화·설명·상담으로 응답합니다. 생성 시 역할·작업 지시·세부 규칙·출력 양식을 명확히 정리해 바로 복사해 운영에 적용할 수 있습니다.",
    prompt: RRRR_SYSTEM_MESSAGE_TEXT
  }
];

function createSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeSessionKey(model, preset) {
  const safeModel = String(model).replace(/[^a-zA-Z0-9_-]/g, "_");
  const safePreset = String(preset).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${SESSION_KEY_PREFIX}-${safeModel}-${safePreset}`;
}

function makeChatKey(model, preset, ragMode = false) {
  if (ragMode) {
    return makeSessionKey(model, RAG_CHAT_PRESET);
  }
  return makeSessionKey(model, preset);
}

const sessionIdsByKey = new Map();

function getOrCreateSessionId(model, preset) {
  const key = makeSessionKey(model, preset);
  const existing = sessionIdsByKey.get(key);
  if (existing) return existing;
  const created = createSessionId();
  sessionIdsByKey.set(key, created);
  return created;
}

function unescapeNewlinesOutsideCodeFences(text) {
  const segments = [];
  const codePattern = /```[\s\S]*?```|`[^`]*`/g;
  let lastIndex = 0;
  let match;

  while ((match = codePattern.exec(text)) !== null) {
    segments.push(text.slice(lastIndex, match.index).replace(/\\n/g, "\n"));
    segments.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  segments.push(text.slice(lastIndex).replace(/\\n/g, "\n"));
  return segments.join("");
}

function extractAssistantText(rawReply) {
  if (rawReply == null) return "(빈 응답)";

  let text = rawReply;

  if (typeof rawReply === "object") {
    if (typeof rawReply.reply === "string") {
      text = rawReply.reply;
    } else if (typeof rawReply.output === "string") {
      text = rawReply.output;
    } else {
      text = JSON.stringify(rawReply);
    }
  }

  if (typeof text === "string") {
    const trimmed = text.trim();
    const looksLikeJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"));

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.reply === "string") {
            text = parsed.reply;
          } else if (typeof parsed.output === "string") {
            text = parsed.output;
          } else {
            text = JSON.stringify(parsed);
          }
        }
      } catch (e) {
        // keep original text when it is not valid JSON
      }
    }

    // Convert escaped newline sequences in prose only; keep code fences literal for copy/paste.
    text = unescapeNewlinesOutsideCodeFences(text);
    return text;
  }

  return String(text);
}

function formatRagActionResponse(rawReply, fallbackText) {
  if (rawReply == null || rawReply === "") {
    return fallbackText;
  }

  const decodeEscapedText = (value) =>
    String(value)
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"');

  const tryParseJson = (value) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    if (
      !(
        trimmed.startsWith("{") ||
        trimmed.startsWith("[") ||
        trimmed.startsWith('"')
      )
    ) {
      return null;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const unwrapJson = (value, depth = 0) => {
    if (depth > 5) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = tryParseJson(value) ?? tryParseJson(decodeEscapedText(value));
      if (parsed != null) {
        return unwrapJson(parsed, depth + 1);
      }
      return decodeEscapedText(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => unwrapJson(item, depth + 1));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, unwrapJson(item, depth + 1)])
      );
    }
    return value;
  };

  const splitEmbeddedJson = (value) => {
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char !== "{" && char !== "[") continue;
      try {
        return {
          prefix: value.slice(0, index).trim(),
          parsed: JSON.parse(value.slice(index).trim())
        };
      } catch {
        // Keep scanning; strings like "[table_name]" are not JSON.
      }
    }
    return null;
  };

  const renderJsonBlock = (value) => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;

  const renderScalar = (value) => {
    if (value == null) {
      return "";
    }
    if (typeof value === "string") {
      const embedded = splitEmbeddedJson(value);
      if (embedded) {
        return [embedded.prefix, renderJsonBlock(embedded.parsed)].filter(Boolean).join("\n\n");
      }
      return value;
    }
    return String(value);
  };

  const renderValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => renderValue(item)).filter(Boolean).join("\n\n");
    }
    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => {
          if (item && typeof item === "object") {
            return `**${key}** :\n\n${renderJsonBlock(item)}`;
          }
          const text = renderScalar(item);
          if (text.includes("\n")) {
            return `**${key}** :\n\n${text}`;
          }
          return `**${key}** : ${text}`;
        })
        .join("\n");
    }
    return renderScalar(value);
  };

  return renderValue(unwrapJson(rawReply));
}

function formatResponseDuration(durationMs) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return "";
  }

  return `${(durationMs / 1000).toFixed(3)}s`;
}

function ChatInputArea({ loading, ragModeEnabled, onSend }) {
  const [input, setInput] = useState("");
  const [largePasteMeta, setLargePasteMeta] = useState(null);
  const inputRef = useRef(null);
  const largePasteRef = useRef("");

  useEffect(() => {
    autoResizeChatInput(inputRef.current);
  }, [input]);

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading]);

  const resetInput = () => {
    largePasteRef.current = "";
    setLargePasteMeta(null);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = `${CHAT_INPUT_MIN_HEIGHT}px`;
    }
  };

  const adoptLargeText = (text, { keepNote = true } = {}) => {
    largePasteRef.current = text;
    setLargePasteMeta({
      lines: countTextLines(text),
      kb: Math.max(1, Math.round(text.length / 1024))
    });
    if (!keepNote) {
      setInput("");
    }
    if (inputRef.current) {
      inputRef.current.style.height = `${CHAT_INPUT_MIN_HEIGHT}px`;
    }
  };

  const composeOutgoingText = () => {
    const attached = String(largePasteRef.current ?? "");
    const note = String(input ?? "").trim();
    if (attached && note) {
      return `${attached}\n\n${note}`.trim();
    }
    return (attached || note).trim();
  };

  const handleSend = () => {
    const text = composeOutgoingText();
    if (!text || loading) return;
    resetInput();
    onSend(text);
  };

  const handleChange = (event) => {
    const next = event.target.value;
    // Keep attached large paste; allow typing a follow-up note in the textarea.
    if (!largePasteRef.current && next.length > LARGE_CHAT_INPUT_CHARS) {
      adoptLargeText(next, { keepNote: false });
      return;
    }
    if (largePasteRef.current && next.length > LARGE_CHAT_INPUT_CHARS) {
      adoptLargeText(next, { keepNote: false });
      return;
    }
    setInput(next);
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData?.getData("text") ?? "";
    if (pasted.length <= LARGE_CHAT_INPUT_CHARS) {
      return;
    }
    event.preventDefault();
    // Keep any already typed note so the user can add more below the large paste.
    adoptLargeText(pasted, { keepNote: true });
  };

  const hasText = largePasteMeta != null || input.length > 0;

  return html`
    <div className="input-area-wrap">
      ${largePasteMeta
        ? html`
            <div className="large-paste-banner">
              <span>
                대용량 붙여넣기 준비됨: ${largePasteMeta.lines.toLocaleString()}줄 / ${largePasteMeta.kb} KB
                (기준 ${Math.round(LARGE_CHAT_INPUT_CHARS / 1000)}K자 초과)
              </span>
              <button type="button" className="large-paste-clear" onClick=${resetInput} disabled=${loading}>
                지우기
              </button>
            </div>
          `
        : null}
      <div className="input-area">
        <textarea
          ref=${inputRef}
          className="chat-input"
          value=${input}
          onChange=${handleChange}
          onPaste=${handlePaste}
          onKeyDown=${(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder=${largePasteMeta
            ? "아래에 추가 내용을 입력할 수 있습니다 (Enter 전송, Shift+Enter 줄바꿈)"
            : "메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"}
          disabled=${loading}
          rows="1"
        />
        <button
          type="button"
          className=${ragModeEnabled
            ? `is-rag-mode${hasText ? " is-rag-mode-ready" : ""}`
            : ""}
          onClick=${handleSend}
          disabled=${loading || !hasText}
        >
          ${loading ? "전송 중..." : "전송"}
        </button>
      </div>
    </div>
  `;
}

function App() {
  const [modelOptions, setModelOptions] = useState(DEFAULT_MODEL_OPTIONS);
  const [model, setModel] = useState(DEFAULT_MODEL_OPTIONS[0].value);
  const [mode, setMode] = useState(CHAT_MODES[1].value);
  const [promptPreset, setPromptPreset] = useState(SYSTEM_PROMPTS[0].value);
  const [systemMessage, setSystemMessage] = useState(SYSTEM_PROMPTS[0].prompt);
  const [messagesByKey, setMessagesByKey] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ragModeEnabled, setRagModeEnabled] = useState(false);
  const [ragFiles, setRagFiles] = useState([]);
  const [ragTableName, setRagTableName] = useState("");
  const [ragDocType, setRagDocType] = useState(RAG_DEFAULT_DOC_TYPE);
  const [ragBusy, setRagBusy] = useState(false);
  const [ragMessage, setRagMessage] = useState("");
  const [ragCreateProgress, setRagCreateProgress] = useState({
    visible: false,
    done: false,
    elapsedMs: 0
  });
  const chatAreaRef = useRef(null);
  const systemTextareaRef = useRef(null);
  const systemPromptBlockRef = useRef(null);
  const ragFileInputRef = useRef(null);
  const ragFilesRef = useRef([]);
  const ragCreateStartedAtRef = useRef(0);
  const ragCreateCloseTimerRef = useRef(null);

  useEffect(() => {
    ragFilesRef.current = ragFiles;
  }, [ragFiles]);

  useEffect(() => {
    if (!ragCreateProgress.visible || ragCreateProgress.done) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const startedAt = ragCreateStartedAtRef.current;
      if (startedAt > 0) {
        setRagCreateProgress((prev) => ({
          ...prev,
          elapsedMs: performance.now() - startedAt
        }));
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [ragCreateProgress.visible, ragCreateProgress.done]);

  useEffect(() => {
    return () => {
      if (ragCreateCloseTimerRef.current) {
        window.clearTimeout(ragCreateCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((response) => {
        if (!response.ok) {
          throw new Error("모델 목록 조회 실패");
        }
        return response.json();
      })
      .then((data) => {
        const nextOptions = normalizeModelOptions(data);
        if (cancelled || nextOptions.length === 0) {
          return;
        }
        setModelOptions(nextOptions);
        setModel((prev) =>
          nextOptions.some((item) => item.value === prev) ? prev : nextOptions[0].value
        );
      })
      .catch(() => {
        // Keep the bundled fallback options when the server-side config cannot be loaded.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chatKey = makeChatKey(model, promptPreset, ragModeEnabled);
  const messages = messagesByKey[chatKey] ?? [];
  const activePreset = SYSTEM_PROMPTS.find((item) => item.value === promptPreset);
  const chatTitle = ragModeEnabled ? RAG_CHAT_TITLE : activePreset?.title ?? "Conversation(user message)";
  const effectivePreset = ragModeEnabled ? RAG_CHAT_PRESET : promptPreset;
  const effectiveSystemMessage = ragModeEnabled ? RAG_SYSTEM_MESSAGE : systemMessage;

  const updateMessages = (targetModel, targetPreset, updater, ragMode = ragModeEnabled) => {
    const key = makeChatKey(targetModel, targetPreset, ragMode);
    setMessagesByKey((prev) => {
      const current = prev[key] ?? [];
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [key]: next };
    });
  };

  const appendRagMessageToChat = (text, responseDurationMs = null) => {
    updateMessages(model, promptPreset, (prev) => [
      ...prev,
      { role: "assistant", text, responseDurationMs }
    ], true);
  };

  const fetchWithTimeout = async (url, options, timeoutMs = 35000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (e) {
      if (e?.name === "AbortError") {
        throw new Error("요청 시간이 초과되었습니다. n8n Webhook 응답 설정을 확인해 주세요.");
      }
      throw e;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    // Force-sync textarea value on initial mount to avoid browser session restore showing stale text.
    setPromptPreset(SYSTEM_PROMPTS[0].value);
    setSystemMessage(SYSTEM_PROMPTS[0].prompt);
  }, []);

  const handlePresetChange = (value) => {
    const preset = SYSTEM_PROMPTS.find((item) => item.value === value);
    setPromptPreset(value);
    if (preset) {
      setSystemMessage(preset.prompt);
    }
    setError("");
    getOrCreateSessionId(model, value);
  };

  const syncSystemTextareaHeight = () => {
    if (!systemTextareaRef.current) return;
    const inputArea = document.querySelector(".input-area");
    if (!inputArea) return;
    const inputBottom = inputArea.getBoundingClientRect().bottom;
    const textareaTop = systemTextareaRef.current.getBoundingClientRect().top;
    const nextHeight = Math.max(220, Math.floor(inputBottom - textareaTop));
    systemTextareaRef.current.style.height = `${nextHeight}px`;
  };

  const handleRagModeToggle = () => {
    setRagModeEnabled((prev) => {
      const next = !prev;
      if (next) {
        getOrCreateSessionId(model, RAG_CHAT_PRESET);
      }
      return next;
    });
    setRagMessage("");
    setError("");
  };

  const hasRagFiles = ragFiles.length > 0;
  const ragFilesFull = ragFiles.length >= RAG_MAX_FILES;
  const ragDocTypeEditable = ragFiles.length === 1;

  useEffect(() => {
    if (ragFiles.length > 1 && ragDocType !== RAG_DEFAULT_DOC_TYPE) {
      setRagDocType(RAG_DEFAULT_DOC_TYPE);
    }
  }, [ragFiles.length, ragDocType]);

  const handleRagFileChange = (event) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) {
      setRagMessage("");
      return;
    }

    let message = "";
    setRagFiles((prev) => {
      const next = [...prev];
      for (const file of selected) {
        if (next.length >= RAG_MAX_FILES) {
          message = `파일은 최대 ${RAG_MAX_FILES}개까지 선택할 수 있습니다.`;
          break;
        }
        if (!isRagAllowedFile(file)) {
          if (!message) {
            message = "Text, PDF, Image 파일만 업로드할 수 있습니다.";
          }
          continue;
        }
        if (next.some((item) => isSameRagFile(item, file))) {
          if (!message) {
            message = "이미 선택된 파일입니다.";
          }
          continue;
        }
        next.push(file);
      }
      return next;
    });
    setRagMessage(message);
  };

  const removeRagFile = (indexToRemove) => {
    if (ragBusy) {
      return;
    }
    setRagFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setRagMessage("");
  };

  const createRagVector = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const files = ragFilesRef.current.filter((file) => file instanceof File);
    const tableName = resolveRagTableName(ragTableName);
    const docType = files.length === 1 ? normalizeRagDocType(ragDocType) : RAG_DEFAULT_DOC_TYPE;
    if (files.length === 0) {
      appendRagMessageToChat("파일을 선택해 주세요.");
      return;
    }
    if (!tableName || tableName === RAG_TABLE_NAME_PREFIX) {
      appendRagMessageToChat("테이블명을 입력해 주세요.");
      return;
    }
    if (ragBusy) {
      return;
    }

    setRagBusy(true);
    const requestStartedAt = performance.now();
    ragCreateStartedAtRef.current = requestStartedAt;
    if (ragCreateCloseTimerRef.current) {
      window.clearTimeout(ragCreateCloseTimerRef.current);
      ragCreateCloseTimerRef.current = null;
    }
    setRagCreateProgress({ visible: true, done: false, elapsedMs: 0 });
    // Let React paint the progress modal before the network request starts.
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    try {
      const formData = new FormData();
      const bodyPayload = {
        action: "create",
        tableName,
        docType,
        mode
      };
      formData.append(
        "body",
        new Blob([JSON.stringify(bodyPayload)], { type: "application/json" })
      );
      files.forEach((file) => formData.append("file", file));
      formData.append("tableName", tableName);
      formData.append("docType", docType);
      formData.append("mode", mode);
      const response = await fetchWithTimeout("/api/rag/vector/create", {
        method: "POST",
        body: formData
      }, 30 * 60 * 1000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "벡터DB 생성 요청 실패");
      }
      setRagFiles([]);
      setRagDocType(RAG_DEFAULT_DOC_TYPE);
      setRagMessage("");
      if (ragFileInputRef.current) {
        ragFileInputRef.current.value = "";
      }
      const message = formatRagActionResponse(
        data.reply,
        `벡터DB 생성 요청이 전송되었습니다. (${mode})`
      );
      appendRagMessageToChat(message, performance.now() - requestStartedAt);
    } catch (e) {
      const message = e.message || "벡터DB 생성에 실패했습니다.";
      appendRagMessageToChat(message, performance.now() - requestStartedAt);
    } finally {
      const elapsedMs = performance.now() - requestStartedAt;
      setRagCreateProgress({ visible: true, done: true, elapsedMs });
      ragCreateCloseTimerRef.current = window.setTimeout(() => {
        setRagCreateProgress((prev) => ({ ...prev, visible: false }));
        ragCreateCloseTimerRef.current = null;
      }, 1500);
      setRagBusy(false);
    }
  };

  const deleteRagVector = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const tableName = resolveRagTableName(ragTableName);
    if (!tableName || tableName === RAG_TABLE_NAME_PREFIX) {
      appendRagMessageToChat("테이블명을 입력해 주세요.");
      return;
    }
    if (ragBusy) {
      return;
    }

    setRagBusy(true);
    const requestStartedAt = performance.now();
    try {
      const response = await fetchWithTimeout("/api/rag/vector/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName,
          mode
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "벡터DB 삭제 요청 실패");
      }
      const message = formatRagActionResponse(
        data.reply,
        "벡터DB 삭제 요청이 전송되었습니다."
      );
      appendRagMessageToChat(message, performance.now() - requestStartedAt);
    } catch (e) {
      const message = e.message || "벡터DB 삭제에 실패했습니다.";
      appendRagMessageToChat(message, performance.now() - requestStartedAt);
    } finally {
      setRagBusy(false);
    }
  };

  useEffect(() => {
    const chatArea = chatAreaRef.current;
    let cancelled = false;
    const runDecorate = () => {
      if (cancelled || !chatArea) return;
      decorateCodeBlocks(chatArea);
    };
    runDecorate();
    // React may finish committing DOM after this effect; decorate again next frame.
    const rafId = window.requestAnimationFrame(runDecorate);
    scrollChatToBottom(chatArea, true);
    syncSystemTextareaHeight();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [messages, loading]);

  useEffect(() => {
    mountSystemPromptCopyButton(systemPromptBlockRef.current, () => effectiveSystemMessage);
  }, [effectiveSystemMessage, promptPreset, loading]);

  useEffect(() => {
    syncSystemTextareaHeight();
    const handleResize = () => {
      syncSystemTextareaHeight();
      scrollChatToBottom(chatAreaRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sendMessage = async (rawText) => {
    const text = String(rawText ?? "").trim();
    if (!text || loading) return;

    const tableName = ragModeEnabled ? resolveRagTableName(ragTableName) : "";
    if (ragModeEnabled && (!tableName || tableName === RAG_TABLE_NAME_PREFIX)) {
      setError("테이블명을 입력해 주세요.");
      return;
    }

    updateMessages(
      model,
      promptPreset,
      (prev) => [...prev, { role: "user", text }],
      ragModeEnabled
    );
    setError("");
    setLoading(true);

    const requestStartedAt = performance.now();

    try {
      const sessionId = getOrCreateSessionId(model, effectivePreset);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          message: text,
          sessionid: sessionId,
          mode,
          promptPreset: effectivePreset,
          systemMessage: effectiveSystemMessage,
          ragMode: ragModeEnabled,
          tableName
        })
      });

      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }

      const data = await response.json();
      const assistantText = extractAssistantText(data.reply);
      const responseDurationMs = performance.now() - requestStartedAt;
      updateMessages(model, promptPreset, (prev) => [
        ...prev,
        { role: "assistant", text: assistantText, responseDurationMs }
      ], ragModeEnabled);
    } catch (e) {
      const responseDurationMs = performance.now() - requestStartedAt;
      setError("메시지 전송에 실패했습니다.");
      updateMessages(model, promptPreset, (prev) => [
        ...prev,
        { role: "assistant", text: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", responseDurationMs }
      ], ragModeEnabled);
    } finally {
      setLoading(false);
    }
  };

  return html`
    <${React.Fragment}>
    <div className="layout">
      <aside className="left-panel">
        <h2>Execution Settings</h2>
        <label htmlFor="mode-toggle">n8n mode</label>
        <button
          id="mode-toggle"
          type="button"
          className=${`mode-toggle ${mode === "service" ? "is-service" : "is-test"}`}
          role="switch"
          aria-checked=${mode === "service"}
          onClick=${() =>
            setMode((prev) => (prev === "service" ? "test" : "service"))}
          disabled=${loading}
        >
          <span className="mode-toggle-text">
            ${CHAT_MODES.find((item) => item.value === mode)?.label ?? mode}
          </span>
          <span className="mode-toggle-switch" aria-hidden="true">
            <span className="mode-toggle-thumb"></span>
          </span>
        </button>
        <label htmlFor="model-select">AI model</label>
        <select
          id="model-select"
          value=${model}
          onChange=${(e) => {
            const selectedModel = e.target.value;
            getOrCreateSessionId(selectedModel, effectivePreset);
            setModel(selectedModel);
          }}
          disabled=${loading}
        >
          ${modelOptions.map(
            (item) => html`<option key=${item.value} value=${item.value}>${item.label}</option>`
          )}
        </select>
        <button
          id="rag-mode-toggle"
          type="button"
          className=${`rag-mode-button ${ragModeEnabled ? "is-active" : ""}`}
          aria-pressed=${ragModeEnabled}
          onClick=${handleRagModeToggle}
          disabled=${loading}
        >
          Retrieval-Augmented Generation
        </button>
        ${ragModeEnabled
          ? html`
              <div className="rag-panel">
                <label htmlFor="rag-file-input">문서 업로드</label>
                <div className="rag-file-picker">
                  <input
                    id="rag-file-input"
                    ref=${ragFileInputRef}
                    type="file"
                    className="rag-file-input-hidden"
                    accept=${RAG_FILE_ACCEPT}
                    multiple
                    onChange=${handleRagFileChange}
                    disabled=${loading || ragFilesFull}
                  />
                  <label
                    htmlFor="rag-file-input"
                    className=${`rag-file-select-button ${loading || ragFilesFull ? "is-disabled" : ""}`}
                  >
                    파일선택 (${ragFiles.length}/${RAG_MAX_FILES})
                  </label>
                </div>
                ${hasRagFiles
                  ? html`<ul className="rag-file-list">
                      ${ragFiles.map(
                        (file, index) => html`
                          <li key=${`${file.name}-${file.lastModified}-${index}`} className="rag-file-name">
                            <span className="rag-file-name-text">${index + 1}. ${file.name}</span>
                            <button
                              type="button"
                              className="rag-file-remove-button"
                              onClick=${() => removeRagFile(index)}
                              disabled=${loading || ragBusy}
                              aria-label=${`${file.name} 삭제`}
                              title="파일 삭제"
                            >
                              삭제
                            </button>
                          </li>
                        `
                      )}
                    </ul>`
                  : html`<p className="rag-file-hint">Text / PDF / Image · 최대 ${RAG_MAX_FILES}개</p>`}
                <div className="rag-panel-lower">
                  <label htmlFor="rag-table-name">테이블명</label>
                  <div className="rag-table-name-field">
                    <span className="rag-table-name-prefix" aria-hidden="true">${RAG_TABLE_NAME_PREFIX}</span>
                    <input
                      id="rag-table-name"
                      type="text"
                      className="rag-text-input rag-table-name-input"
                      value=${ragTableName}
                      onChange=${(e) => {
                        let next = e.target.value;
                        if (next.startsWith(RAG_TABLE_NAME_PREFIX)) {
                          next = next.slice(RAG_TABLE_NAME_PREFIX.length);
                        }
                        setRagTableName(next);
                      }}
                      placeholder="your_table"
                      disabled=${loading}
                    />
                  </div>
                  <label htmlFor="rag-doc-type">문서 종류</label>
                  <input
                    id="rag-doc-type"
                    type="text"
                    className="rag-text-input"
                    value=${ragDocType}
                    onChange=${(e) => setRagDocType(e.target.value)}
                    placeholder=${RAG_DEFAULT_DOC_TYPE}
                    disabled=${!ragDocTypeEditable || loading}
                  />
                  <div className="rag-actions">
                    <button
                      type="button"
                      className="rag-action-button"
                      onClick=${createRagVector}
                      disabled=${!hasRagFiles || !ragTableName.trim() || loading || ragBusy}
                    >
                      ${ragBusy ? "처리 중..." : "벡터DB 생성"}
                    </button>
                    <button
                      type="button"
                      className="rag-action-button rag-action-button-danger"
                      onClick=${deleteRagVector}
                      disabled=${!ragTableName.trim() || loading || ragBusy}
                    >
                      벡터DB 삭제
                    </button>
                  </div>
                  <div className="rag-table-hint-box">
                    <p className="rag-table-hint-title">※ 참고 ※</p>
                    <p className="rag-table-hint">${RAG_TABLE_NAME_HINT}</p>
                  </div>
                </div>
              </div>
            `
          : null}
      </aside>
      <main className="right-panel">
        <h2>${chatTitle}</h2>
        <div className="chat-area" ref=${chatAreaRef}>
          ${messages.length === 0 && !loading
            ? html`
                <div className="preset-intro">
                  <h3>${ragModeEnabled ? RAG_CHAT_TITLE : activePreset?.title ?? ""}</h3>
                  <p>${ragModeEnabled ? RAG_CHAT_INTRO : activePreset?.intro ?? ""}</p>
                </div>
              `
            : messages.map(
                (message, idx) => html`
                  <div
                    key=${`${message.role}-${idx}`}
                    className=${`message ${message.role}${
                      message.role === "assistant" &&
                      (messageHasCodeBlock(message.text) ||
                        looksLikeSystemPromptOutput(message.text))
                        ? " has-code"
                        : ""
                    }`}
                  >
                    <div className="message-toolbar">
                      ${message.role === "user"
                        ? html`<strong className="user-label">You</strong>`
                        : html`
                            <div className="assistant-meta">
                              <strong className="assistant-label">AI Assistant</strong>
                              ${message.responseDurationMs != null
                                ? html`<span className="response-duration">
                                    Response ${formatResponseDuration(message.responseDurationMs)}
                                  </span>`
                                : null}
                            </div>
                          `}
                      <${MessageCopyButton} text=${message.text} />
                    </div>
                    ${message.role === "assistant"
                      ? html`<span
                          className="markdown-body"
                          dangerouslySetInnerHTML=${{
                            __html: buildAssistantHtml(message.text, promptPreset)
                          }}
                        ></span>`
                      : html`<span className="message-text">${message.text}</span>`}
                  </div>
                `
              )}
          ${loading
            ? html`
                <div className="message assistant loading">
                  <strong className="assistant-label">AI Assistant</strong>
                  <div className="typing-indicator" aria-label="응답 생성 중">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              `
            : null}
        </div>
        <${ChatInputArea}
          loading=${loading}
          ragModeEnabled=${ragModeEnabled}
          onSend=${sendMessage}
        />
        ${error ? html`<p className="error">${error}</p>` : null}
      </main>
      <aside className="system-panel">
        <h2>System Prompt Preset</h2>
        <div className="preset-group" role="group" aria-label="System Prompt Preset">
          ${SYSTEM_PROMPTS.map(
            (item) => html`
              <button
                key=${item.value}
                type="button"
                className=${`preset-button ${promptPreset === item.value ? "is-active" : ""}`}
                aria-pressed=${promptPreset === item.value}
                onClick=${() => handlePresetChange(item.value)}
                disabled=${loading || ragModeEnabled}
                title=${item.label}
              >
                ${item.label}
              </button>
            `
          )}
        </div>
        <div className="system-prompt-block code-block" ref=${systemPromptBlockRef}>
          <textarea
            id="system-message"
            ref=${systemTextareaRef}
            value=${effectiveSystemMessage}
            onChange=${(e) => setSystemMessage(e.target.value)}
            placeholder="시스템 메시지를 입력하세요"
            spellCheck=${false}
            autocapitalize="off"
            autocorrect="off"
            autocomplete="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            readOnly=${ragModeEnabled}
            disabled=${loading || ragModeEnabled}
            rows="12"
          />
        </div>
      </aside>
    </div>
    ${ragCreateProgress.visible
      ? createPortal(
          html`
            <div className="rag-progress-overlay" role="alertdialog" aria-modal="true" aria-live="assertive">
              <div className="rag-progress-modal">
                <h3>Vector DB ${ragCreateProgress.done ? "Complete" : "Creating"}</h3>
                <p className="rag-progress-message">
                  ${ragCreateProgress.done
                    ? "Vector DB create request has finished."
                    : "Uploading documents and creating the vector DB."}
                </p>
                <div className="rag-progress-bar" aria-hidden="true">
                  <div className=${`rag-progress-bar-fill ${ragCreateProgress.done ? "is-done" : ""}`}></div>
                </div>
                <p className="rag-progress-elapsed">
                  Elapsed: ${(ragCreateProgress.elapsedMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>
          `,
          document.body
        )
      : null}
    </${React.Fragment}>
  `;
}

createRoot(document.getElementById("root")).render(html`<${App} />`);
