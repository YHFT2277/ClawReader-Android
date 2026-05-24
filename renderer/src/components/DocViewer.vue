<template>
  <div class="doc-viewer" ref="viewerRef">
    <div v-if="!content" class="empty-state">
      <div class="empty-icon">📄</div>
      <p>点击「打开文件」选择文档</p>
      <p class="empty-hint">
        支持格式：TXT、MD、JSON、代码文件<br/>
        Word (.docx)、Excel (.xlsx)、PPT (.pptx)<br/>
        选中文本后可使用 AI 翻译、出题等功能
      </p>
      <div v-if="fileHistory.length" class="history-section">
        <p class="history-title">📂 最近打开</p>
        <div v-for="f in fileHistory" :key="f.path" class="history-item" @click="$emit('open-history', f.path)">
          <span class="history-name">{{ f.name }}</span>
          <span class="history-time">{{ f.timeLabel }}</span>
        </div>
      </div>
    </div>
    <div v-else class="doc-content" @mouseup="handleTextSelection">
      <div class="doc-header">
        <span class="doc-title">{{ fileName || '未命名文档' }}</span>
        <span class="doc-stats">{{ content.length }} 字符 | {{ lineCount }} 行</span>
      </div>
      <pre class="doc-body"><code v-html="displayContent" ref="codeRef"></code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { getFileHistory, formatHistoryTime } from '../utils/fileHistory.js';

const props = defineProps({
  content: { type: String, default: '' },
  fileName: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  searchActive: { type: Boolean, default: false },
});
const emit = defineEmits(['text-selected', 'open-history']);

const viewerRef = ref(null);
const codeRef = ref(null);
const searchMatchCount = ref(0);
const currentMatchIndex = ref(0);

const fileHistory = ref(getFileHistory().map(f => ({ ...f, timeLabel: formatHistoryTime(f.time) })).slice(0, 8));

const lineCount = computed(() => {
  if (!props.content) return 0;
  return props.content.split('\n').length;
});

// 转义 HTML 防止 XSS
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 高亮渲染
const displayContent = computed(() => {
  if (!props.content) return '';
  if (!props.searchActive || !props.searchQuery.trim()) {
    return escapeHtml(props.content);
  }
  const escaped = escapeHtml(props.content);
  const query = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${query})`, 'gi');
  searchMatchCount.value = (escaped.match(regex) || []).length;
  return escaped.replace(regex, (m, idx) => {
    const globalIdx = countVisibleBefore(m, escaped, idx);
    return `<mark class="search-highlight" data-idx="${globalIdx}">${m}</mark>`;
  });
});

function countVisibleBefore(match, full, matchIdx) {
  // 简单计数：顺序 match 的 index
  const query = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(query, 'gi');
  let count = 0;
  let m;
  while ((m = regex.exec(full)) !== null) {
    if (m.index >= matchIdx) break;
    count++;
  }
  return count;
}

// 导航到指定匹配项
function navigateSearch(direction) {
  const marks = codeRef.value?.querySelectorAll('.search-highlight');
  if (!marks || marks.length === 0) return;

  // 移除当前激活
  marks.forEach(m => m.classList.remove('active'));

  // 计算目标索引
  if (direction === 'next') {
    currentMatchIndex.value = (currentMatchIndex.value + 1) % marks.length;
  } else if (direction === 'prev') {
    currentMatchIndex.value = (currentMatchIndex.value - 1 + marks.length) % marks.length;
  } else {
    currentMatchIndex.value = 0;
  }

  const target = marks[currentMatchIndex.value];
  if (target) {
    target.classList.add('active');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

watch(() => props.searchQuery, () => {
  currentMatchIndex.value = 0;
  nextTick(() => { navigateSearch('current'); });
});

function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  if (text) {
    emit('text-selected', text);
  }
}

defineExpose({ navigateSearch, searchMatchCount });
</script>

<style scoped>
.doc-viewer {
  flex: 1;
  overflow: auto;
  background: var(--docview-bg);
  color: var(--docview-text);
}

/* Empty state */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
  gap: 8px;
  padding: 20px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}
.empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* History section */
.history-section {
  margin-top: 24px;
  width: 100%;
  max-width: 320px;
}
.history-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-align: left;
  font-weight: 600;
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}
.history-item:hover {
  background: var(--color-accent-bg);
}
.history-name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.history-time {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* Document content */
.doc-content {
  min-height: 100%;
}

.doc-header {
  position: sticky;
  top: 0;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border-default);
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
}
.doc-title {
  font-weight: 600;
  color: var(--color-accent);
  font-size: 14px;
}
.doc-stats {
  font-size: 11px;
  color: var(--text-muted);
}

.doc-body {
  margin: 0;
  padding: 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--docview-text);
  background: transparent;
}

/* Search highlights */
:deep(.search-highlight) {
  background: rgba(255, 193, 7, 0.35);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
:deep(.search-highlight.active) {
  background: rgba(255, 152, 0, 0.7);
  color: #000;
  outline: 2px solid #ff9800;
  outline-offset: 1px;
}

/* Selection highlight */
::selection {
  background: var(--color-accent-bg);
  color: var(--text-primary);
}
</style>