<template>
  <div class="doc-viewer" ref="viewerRef" @scroll="onScroll">
    <div v-if="!content" class="empty-state">
      <div class="empty-icon">📄</div>
      <p>点击「打开文件」选择文档</p>
      <p class="empty-hint">
        支持格式：TXT、MD、JSON、代码文件<br/>
        Word (.docx)、Excel (.xlsx)、PPT (.pptx)<br/>
        选中文本后可使用 AI 翻译、出题等功能
      </p>

      <!-- 收藏列表 -->
      <div v-if="favoriteList.length" class="history-section">
        <p class="history-title">⭐ 收藏</p>
        <div v-for="f in favoriteList" :key="'fav-' + f.path" class="history-item" @click="$emit('open-history', f.path)">
          <span class="history-star">⭐</span>
          <span class="history-name">{{ f.name }}</span>
          <span class="history-time">{{ f.timeLabel }}</span>
        </div>
      </div>

      <!-- 最近打开 -->
      <div v-if="fileHistory.length" class="history-section">
        <p class="history-title">📂 最近打开</p>
        <div v-for="f in fileHistory" :key="'hist-' + f.path" class="history-item" @click="$emit('open-history', f.path)">
          <span class="history-name">{{ f.name }}</span>
          <span class="history-time">{{ f.timeLabel }}</span>
        </div>
      </div>
    </div>
    <div v-else class="doc-content" @mouseup="handleTextSelection">
      <div class="doc-header">
        <span class="doc-title" @click="toggleFavInIcon" :title="isFav ? '取消收藏' : '添加到收藏'">
          <span class="fav-icon" :class="{ active: isFav }">{{ isFav ? '⭐' : '☆' }}</span>
          {{ fileName || '未命名文档' }}
        </span>
        <span class="doc-stats">{{ content.length }} 字符 | {{ lineCount }} 行</span>
      </div>
      <pre class="doc-body" :style="{ fontSize: fontSize + 'px' }"><code v-html="displayContent" ref="codeRef"></code></pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { getFileHistory, getFavorites, toggleFavorite, isFavorite, getReadingProgress, saveReadingProgress, formatHistoryTime } from '../utils/fileHistory.js';

const props = defineProps({
  content: { type: String, default: '' },
  fileName: { type: String, default: '' },
  filePath: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  searchActive: { type: Boolean, default: false },
  fontSize: { type: Number, default: 14 },
});
const emit = defineEmits(['text-selected', 'open-history', 'toggle-fav']);

const viewerRef = ref(null);
const codeRef = ref(null);
const searchMatchCount = ref(0);
const currentMatchIndex = ref(0);
const isFav = ref(false);

const fileHistory = ref(getFileHistory().map(f => ({ ...f, timeLabel: formatHistoryTime(f.time) })).slice(0, 8));

// 刷新历史和收藏列表
function refreshLists() {
  fileHistory.value = getFileHistory().map(f => ({ ...f, timeLabel: formatHistoryTime(f.time) })).slice(0, 8);
  favoriteList.value = getFavorites().map(f => ({ ...f, timeLabel: formatHistoryTime(f.time) })).slice(0, 10);
}

const favoriteList = ref(getFavorites().map(f => ({ ...f, timeLabel: formatHistoryTime(f.time) })).slice(0, 10));

// 监听 filePath 变化，检查收藏状态
watch(() => props.filePath, (p) => {
  isFav.value = p ? isFavorite(p) : false;
  // 恢复阅读进度
  if (p && props.content) {
    nextTick(() => restoreProgress(p));
  }
});

// 恢复阅读进度
function restoreProgress(path) {
  const p = getReadingProgress(path);
  if (p && viewerRef.value) {
    const ratio = p.totalHeight > 0 ? p.scrollTop / p.totalHeight : 0;
    const target = ratio * viewerRef.value.scrollHeight;
    viewerRef.value.scrollTo({ top: target, behavior: 'instant' });
  }
}

// 保存阅读进度（防抖）
let scrollTimer = null;
function onScroll() {
  if (!props.filePath || !viewerRef.value) return;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    saveReadingProgress(
      props.filePath,
      viewerRef.value.scrollTop,
      viewerRef.value.scrollHeight
    );
  }, 500);
}

// 收藏切换
function toggleFavInIcon() {
  if (!props.filePath) return;
  const favd = toggleFavorite({ name: props.fileName, path: props.filePath });
  isFav.value = favd;
  refreshLists();
}

// 暴露给父组件
defineExpose({ navigateSearch, searchMatchCount });

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
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
});

// 导航到指定匹配项
function navigateSearch(direction) {
  const marks = codeRef.value?.querySelectorAll('.search-highlight');
  if (!marks || marks.length === 0) return;

  marks.forEach(m => m.classList.remove('active'));

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

/* History & Favorites sections */
.history-section {
  margin-top: 24px;
  width: 100%;
  max-width: 360px;
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
  gap: 8px;
}
.history-item:hover {
  background: var(--color-accent-bg);
}
.history-star {
  font-size: 13px;
  flex-shrink: 0;
}
.history-name {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.fav-icon {
  font-size: 16px;
  transition: transform 0.2s;
  opacity: 0.5;
}
.fav-icon.active {
  opacity: 1;
}
.fav-icon:hover {
  transform: scale(1.2);
  opacity: 1;
}
.doc-stats {
  font-size: 11px;
  color: var(--text-muted);
}

.doc-body {
  margin: 0;
  padding: 20px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
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