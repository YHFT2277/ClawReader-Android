<template>
  <div class="ai-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-3 7h-8c-1-2-3-4-3-7a7 7 0 0 1 7-7z"/>
          <line x1="9" y1="22" x2="15" y2="22"/>
        </svg>
        <span>ClawReader AI</span>
      </div>
      <button class="btn-close" @click="$emit('close')" title="关闭面板">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- File context info -->
    <div v-if="fileInfo.name" class="file-context">
      📄 {{ fileInfo.name }}
      <span class="file-pages">{{ contentLength }} 字符</span>
    </div>

    <!-- Action buttons -->
    <div class="action-bar">
      <button class="action-btn" @click="doSummarize" :disabled="loading || !fileContent" title="AI 摘要">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="14" y2="18"/>
        </svg>
        摘要
      </button>
      <button class="action-btn" @click="doTranslate('zh')" :disabled="loading || !selectedText" title="翻译选中内容">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/>
        </svg>
        翻译
      </button>
      <button class="action-btn" @click="doQuiz" :disabled="loading || !selectedText" title="根据选中内容出题">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        出题
      </button>
    </div>

    <!-- Language selector for translate -->
    <div v-if="showLangSelector" class="lang-selector">
      <span>目标语言：</span>
      <button v-for="lang in languages" :key="lang.code"
        class="lang-btn" :class="{ active: targetLang === lang.code }"
        @click="doTranslate(lang.code)">
        {{ lang.label }}
      </button>
    </div>

    <!-- Chat messages -->
    <div class="chat-area" ref="chatAreaRef">
      <div v-if="messages.length === 0" class="welcome-msg">
        <div class="welcome-icon">🤖</div>
        <p>ClawReader AI 已就绪</p>
        <p class="welcome-hint">
          选择 PDF 文本后点击「翻译」或「出题」<br/>
          或直接输入问题
        </p>
      </div>

      <div v-for="(msg, idx) in messages" :key="idx"
        class="chat-bubble" :class="msg.role">

        <div class="bubble-header" v-if="msg.role === 'assistant'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-3 7h-8c-1-2-3-4-3-7a7 7 0 0 1 7-7z"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
          </svg>
          AI 助手
        </div>

        <div class="bubble-body" v-html="formatMessage(msg.content)"></div>

        <!-- Quiz cards -->
        <div v-if="msg.quiz && msg.quiz.length" class="quiz-cards">
          <div v-for="q in msg.quiz" :key="q.id" class="quiz-card">
            <p class="quiz-q">{{ q.id }}. {{ q.question }}</p>
            <div class="quiz-opts">
              <label v-for="(opt, oi) in q.options" :key="oi"
                class="quiz-opt" :class="{ correct: showAnswers && oi === q.answer }">
                <input type="radio" :name="'q' + q.id" @change="checkAnswer(q.id, oi)" />
                {{ opt }}
              </label>
            </div>
          </div>
          <button class="btn-show-answer" @click="showAnswers = !showAnswers">
            {{ showAnswers ? '隐藏答案' : '显示答案' }}
          </button>
        </div>

        <div class="bubble-time">{{ msg.time }}</div>
      </div>

      <div v-if="loading" class="typing-indicator">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
    </div>

    <!-- Input area -->
    <div class="input-area">
      <textarea
        v-model="userInput"
        class="input-box"
        placeholder="输入问题，Enter 发送，Shift+Enter 换行..."
        @keydown="handleKeydown"
        :disabled="loading"
        rows="1"
        ref="inputRef"
      />
      <button class="btn-send" @click="sendMessage" :disabled="loading || !userInput.trim()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory.js';

const props = defineProps({
  fileInfo: { type: Object, default: () => ({ name: '', path: '', size: 0 }) },
  selectedText: { type: String, default: '' },
  fileContent: { type: String, default: '' },
  filePath: { type: String, default: '' },
  currentModel: { type: String, default: '' },
});
const emit = defineEmits(['close']);

// State
const messages = ref([]);
const userInput = ref('');
const loading = ref(false);
const showLangSelector = ref(false);
const targetLang = ref('zh');
const showAnswers = ref(false);
const chatAreaRef = ref(null);
const inputRef = ref(null);

const contentLength = computed(() => props.fileContent?.length || 0);

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

// Scroll chat to bottom
function scrollToBottom() {
  nextTick(() => {
    const el = chatAreaRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

// === Chat History Persistence ===
// 加载历史消息
onMounted(() => {
  if (props.filePath) {
    const saved = loadChatHistory(props.filePath);
    if (saved.length > 0) {
      messages.value = saved;
      scrollToBottom();
    }
  }
});

// 自动保存（防抖：2s 内无新消息则保存）
let saveTimer = null;
watch(() => messages.value.length, () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (props.filePath && messages.value.length > 0) {
      saveChatHistory(props.filePath, messages.value);
    }
  }, 2000);
});

// 面板关闭前保存
onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer);
  if (props.filePath && messages.value.length > 0) {
    saveChatHistory(props.filePath, messages.value);
  }
});

// Format message (basic markdown-like)
function formatMessage(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

// Get current time string
function now() {
  const d = new Date();
  return d.getHours().toString().padStart(2, '0') + ':' +
    d.getMinutes().toString().padStart(2, '0');
}

// === AI Actions ===

async function doSummarize() {
  if (loading.value) return;
  loading.value = true;
  showLangSelector.value = false;

  messages.value.push({
    role: 'user',
    content: '📝 请总结这篇文档',
    time: now(),
  });
  scrollToBottom();

  try {
    const text = props.fileContent || '';
    const truncated = text.length > 15000 ? text.slice(0, 15000) + '\n...（内容已截断）' : text;
    const result = await window.electronAPI.summarize(truncated, props.currentModel);
    messages.value.push({
      role: 'assistant',
      content: result.success ? result.summary : '摘要失败：' + (result.error || '未知错误'),
      time: now(),
    });
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '摘要出错：' + e.message,
      time: now(),
    });
  }
  loading.value = false;
  scrollToBottom();
}

async function doTranslate(lang) {
  if (loading.value) return;
  const text = props.selectedText;
  if (!text) {
    alert('请先在 PDF 中选中一段文字');
    return;
  }
  targetLang.value = lang;
  showLangSelector.value = false;
  loading.value = true;

  const langLabel = languages.find(l => l.code === lang)?.label || lang;
  messages.value.push({
    role: 'user',
    content: `🌐 翻译为${langLabel}：\n"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
    time: now(),
  });
  scrollToBottom();

  try {
    const result = await window.electronAPI.translate(text, lang, props.currentModel);
    messages.value.push({
      role: 'assistant',
      content: result.success ? result.translated : '翻译失败：' + (result.error || '未知错误'),
      time: now(),
    });
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '翻译出错：' + e.message,
      time: now(),
    });
  }
  loading.value = false;
  scrollToBottom();
}

async function doQuiz() {
  if (loading.value) return;
  const text = props.selectedText;
  if (!text) {
    alert('请先在 PDF 中选中一段文字作为出题范围');
    return;
  }
  loading.value = true;
  showLangSelector.value = false;

  messages.value.push({
    role: 'user',
    content: `📝 根据选中内容出题`,
    time: now(),
  });
  scrollToBottom();

  try {
    const result = await window.electronAPI.generateQuiz(text, props.currentModel);
    if (result.success && result.questions?.length) {
      messages.value.push({
        role: 'assistant',
        content: `已生成 ${result.questions.length} 道题目，请作答：`,
        quiz: result.questions,
        time: now(),
      });
    } else {
      messages.value.push({
        role: 'assistant',
        content: '出题失败：' + (result.error || '未知错误'),
        time: now(),
      });
    }
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '出题出错：' + e.message,
      time: now(),
    });
  }
  loading.value = false;
  scrollToBottom();
}

// Free chat
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || loading.value) return;
  userInput.value = '';
  loading.value = true;
  showLangSelector.value = false;

  messages.value.push({ role: 'user', content: text, time: now() });
  scrollToBottom();

  try {
    // 构建上下文信息
    const ctxParts = [];
    if (props.selectedText) ctxParts.push('选中文本：' + props.selectedText.substring(0, 500));
    if (props.fileInfo.name) ctxParts.push('当前文档：' + props.fileInfo.name);
    const context = ctxParts.length > 0 ? '\n\n（参考上下文：' + ctxParts.join('；') + '）' : '';

    const result = await window.electronAPI.chat(text + context, props.currentModel);
    messages.value.push({
      role: 'assistant',
      content: result.success ? result.reply : '发送失败，请重试：' + (result.error || '未知错误'),
      time: now(),
    });
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: '出错了：' + e.message,
      time: now(),
    });
  }
  loading.value = false;
  scrollToBottom();
  nextTick(() => { inputRef.value?.focus(); });
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Get document content for AI (truncated if too long)
function getDocumentContent() {
  const text = props.fileContent || '';
  if (text.length > 15000) {
    return text.slice(0, 15000) + '\n...（内容已截断，共 ' + text.length + ' 字符）';
  }
  return text;
}

// Watch selectedText -> show translate option
watch(() => props.selectedText, (text) => {
  if (text && text.length > 0) {
    showLangSelector.value = true;
  }
});
</script>

<style scoped>
.ai-panel {
  width: 360px;
  min-width: 300px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  height: 100%;
  color: var(--text-secondary);
  font-size: 13px;
}

/* Mobile: full-screen overlay */
@media (max-width: 768px) {
  .ai-panel {
    position: fixed;
    inset: 0;
    width: 100%;
    min-width: auto;
    z-index: 300;
    border-left: none;
  }
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--color-accent);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}
.btn-close:hover {
  background: var(--color-accent-bg);
  color: var(--text-primary);
}

/* File context */
.file-context {
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--color-accent-bg);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.file-pages {
  font-size: 11px;
  background: var(--bg-input);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

/* Action bar */
.action-bar {
  display: flex;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.action-btn:hover:not(:disabled) {
  background: var(--color-accent-bg);
  color: var(--text-primary);
  border-color: var(--color-accent);
}
.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Lang selector */
.lang-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.lang-btn {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.lang-btn:hover, .lang-btn.active {
  background: var(--color-accent);
  color: var(--text-on-primary);
  border-color: var(--color-accent);
}

/* Chat area */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.welcome-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
  gap: 6px;
}
.welcome-icon { font-size: 36px; margin-bottom: 4px; }
.welcome-hint { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

/* Chat bubbles */
.chat-bubble {
  max-width: 88%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chat-bubble.user {
  align-self: flex-end;
}
.chat-bubble.assistant {
  align-self: flex-start;
}

.bubble-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-accent);
  font-weight: 500;
}

.bubble-body {
  padding: 8px 12px;
  border-radius: 10px;
  line-height: 1.6;
  word-break: break-word;
}
.chat-bubble.user .bubble-body {
  background: var(--chat-bg-user);
  color: var(--text-on-primary);
  border-bottom-right-radius: 2px;
}
.chat-bubble.assistant .bubble-body {
  background: var(--chat-bg-assistant);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-bottom-left-radius: 2px;
}

.bubble-time {
  font-size: 10px;
  color: var(--text-muted);
  padding: 0 4px;
}

/* Quiz */
.quiz-cards {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quiz-card {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px;
}
.quiz-q {
  font-weight: 500;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}
.quiz-opts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.quiz-opt {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: background 0.15s;
}
.quiz-opt:hover {
  background: var(--color-accent-bg);
}
.quiz-opt.correct {
  background: rgba(76, 175, 80, 0.15);
  color: #81c784;
}
.quiz-opt input { display: none; }

.btn-show-answer {
  margin-top: 6px;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.btn-show-answer:hover {
  background: var(--color-accent-bg);
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  align-self: flex-start;
}
.dot {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: blink 1.2s infinite both;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink {
  0% { opacity: 0.2; }
  50% { opacity: 1; }
  100% { opacity: 0.2; }
}

/* Input area */
.input-area {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-default);
  flex-shrink: 0;
  align-items: flex-end;
}

.input-box {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  max-height: 80px;
}
.input-box:focus {
  border-color: var(--color-accent);
}
.input-box::placeholder {
  color: var(--text-muted);
}

.btn-send {
  padding: 8px 12px;
  background: var(--color-accent);
  border: none;
  border-radius: 8px;
  color: var(--text-on-primary);
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}
.btn-send:hover:not(:disabled) {
  background: var(--color-accent-hover);
}
.btn-send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>