<template>
  <div class="app-container">
      <Toolbar
      :file-info="fileInfo"
      :has-file="!!fileContent"
      :panel-open="showPanel"
      :theme="currentTheme"
      :search-active="searchActive"
      :search-query="searchQuery"
      :search-count="searchMatchCount"
      :search-idx="searchCurrentIdx"
      :model-list="modelList"
      :current-model="currentModel"
      :font-size="fontSize"
      @open-file="openFile"
      @toggle-panel="togglePanel"
      @change-theme="onChangeTheme"
      @change-model="onChangeModel"
      @search="onSearch"
      @search-nav="onSearchNav"
      @search-close="onSearchClose"
      @open-history="onOpenHistory"
      @change-font-size="onChangeFontSize"
      @export-file="onExportFile"
    />
    <div class="main-content">
      <!-- Welcome: no file open yet -->
      <div v-if="!fileContent && !loading" class="welcome-screen">
        <div class="welcome-content">
          <div class="welcome-icon">📖</div>
          <h2>ClawReader</h2>
          <p class="welcome-sub">智能文档阅读器</p>
          <p class="welcome-hint">支持 TXT、Markdown、Word、Excel、PPT</p>
          <button class="welcome-btn" @click="openFile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
            打开文件
          </button>
        </div>
      </div>
      <DocViewer
        v-if="fileContent"
        ref="docViewerRef"
        :content="fileContent"
        :file-name="fileInfo.name"
        :file-path="fileInfo.path"
        :search-query="searchQuery"
        :search-active="searchActive"
        :font-size="fontSize"
        @text-selected="onTextSelected"
        @open-history="onOpenHistory"
      />
      <transition name="slide">
        <AiPanel
          v-if="showPanel"
          :file-info="fileInfo"
          :selected-text="selectedText"
          :file-content="fileContent"
          :file-path="fileInfo.path"
          :current-model="currentModel"
          @close="onPanelClose"
        />
      </transition>
      <!-- 浮动 AI 按钮：面板关闭时显示，点击重新打开 -->
      <button v-if="!showPanel" class="floating-ai-btn" @click="openPanel" title="打开 AI 助手">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5-3 7h-8c-1-2-3-4-3-7a7 7 0 0 1 7-7z"/>
          <line x1="9" y1="22" x2="15" y2="22"/>
        </svg>
      </button>
    </div>
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Toolbar from './components/Toolbar.vue';
import DocViewer from './components/DocViewer.vue';
import AiPanel from './components/AiPanel.vue';
import { parseDocument, getFileTypeLabel, getFileTypeColor } from './utils/documentParser.js';
import { addFileHistory } from './utils/fileHistory.js';

// State
const fileContent = ref('');
const fileInfo = ref({ name: '', path: '', size: 0 });
const selectedText = ref('');
const showPanel = ref(true);
const loading = ref(false);
const docViewerRef = ref(null);

// Search state
const searchQuery = ref('');
const searchActive = ref(false);
const searchMatchCount = ref(0);
const searchCurrentIdx = ref(0);

// Theme
const currentTheme = ref(localStorage.getItem('clawreader-theme') || 'dark');
function onChangeTheme(theme) {
  currentTheme.value = theme;
  localStorage.setItem('clawreader-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// Font size
const fontSize = ref(Number(localStorage.getItem('clawreader-fontsize')) || 14);
function onChangeFontSize(delta) {
  const next = Math.max(10, Math.min(24, fontSize.value + delta));
  fontSize.value = next;
  localStorage.setItem('clawreader-fontsize', String(next));
}

// Export
async function onExportFile(format) {
  if (!fileContent.value || !fileInfo.value.name) return;
  const baseName = fileInfo.value.name.replace(/\.[^.]+$/, '');
  const ext = format === 'md' ? '.md' : '.txt';
  const defaultName = baseName + ext;

  let content = fileContent.value;
  if (format === 'md') {
    // 添加 Markdown 头信息
    const now = new Date().toLocaleString('zh-CN');
    content = `# ${fileInfo.value.name}\n\n> 导出时间：${now}\n> 总字符数：${fileContent.value.length}\n\n---\n\n${fileContent.value}`;
  }

  const result = await window.electronAPI.saveFile({
    defaultName,
    content,
    filters: [
      format === 'md'
        ? { name: 'Markdown', extensions: ['md'] }
        : { name: 'Text Files', extensions: ['txt'] },
    ],
  });

  if (result.success) {
    console.log('[App] Exported to:', result.path);
  } else if (!result.canceled) {
    alert('导出失败：' + (result.error || '未知错误'));
  }
}

// Model
const modelList = ref([]);
const currentModel = ref(localStorage.getItem('clawreader-model') || '');

async function loadModels() {
  try {
    const result = await window.electronAPI.getModelList();
    if (result.success) {
      modelList.value = result.models;
      if (!currentModel.value && result.models.length) {
        currentModel.value = result.current || result.models[0].id;
      }
    }
  } catch (err) {
    console.error('Failed to load models:', err);
  }
}

async function onChangeModel(modelId) {
  try {
    const result = await window.electronAPI.setModel(modelId);
    if (result.success) {
      currentModel.value = modelId;
      localStorage.setItem('clawreader-model', modelId);
    }
  } catch (err) {
    console.error('Failed to set model:', err);
  }
}

// Supported file extensions
const SUPPORTED_EXTS = ['.txt', '.md', '.markdown', '.json', '.js', '.ts', '.vue', '.html', '.css', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.php', '.rb', '.sh', '.yaml', '.yml', '.xml', '.sql', '.log', '.docx', '.xlsx', '.pptx'];

// Open file (from picker)
async function openFile() {
  const filePath = await window.electronAPI.openFile();
  if (!filePath) return;
  await loadFile(filePath);
}

// Open file from history
async function onOpenHistory(filePath) {
  if (!filePath) return;
  await loadFile(filePath);
}

// Core: load file by path
async function loadFile(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (!SUPPORTED_EXTS.includes(ext)) {
    alert('暂不支持该文件格式。支持的格式：' + SUPPORTED_EXTS.join(', '));
    return;
  }

  loading.value = true;
  try {
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) throw new Error(result.error);

    const info = await window.electronAPI.getFileInfo(filePath);
    fileInfo.value = info;

    let text = '';
    let docType = 'text';

    if (['.docx', '.xlsx', '.pptx'].includes(ext)) {
      try {
        const parseResult = await parseDocument(info.name, result.data);
        text = parseResult.text;
        docType = parseResult.type;
        fileInfo.value = {
          ...info,
          docType,
          docLabel: getFileTypeLabel(docType),
          docColor: getFileTypeColor(docType),
        };
      } catch (err) {
        console.error('Document parse error:', err);
        alert('文档解析失败：' + err.message);
        loading.value = false;
        return;
      }
    } else {
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        text = decoder.decode(result.data);
      } catch (e) {
        try {
          const decoder = new TextDecoder('gbk');
          text = decoder.decode(result.data);
        } catch (e2) {
          const decoder = new TextDecoder('utf-8');
          text = decoder.decode(result.data);
        }
      }
    }
    fileContent.value = text;

    // 记录历史
    addFileHistory({ name: info.name, path: filePath, size: info.size });

    console.log('[App] File loaded! size:', info.size, 'chars:', fileContent.value.length);
  } catch (err) {
    console.error('Failed to load file:', err);
    alert('无法加载文件：' + err.message);
  } finally {
    loading.value = false;
  }
}

// Search handlers
function onSearch(query) {
  searchQuery.value = query;
  searchActive.value = !!query.trim();
  searchCurrentIdx.value = 0;
}
function onSearchNav(direction) {
  if (!docViewerRef.value) return;
  docViewerRef.value.navigateSearch(direction);
}
function onSearchClose() {
  searchQuery.value = '';
  searchActive.value = false;
  searchCurrentIdx.value = 0;
}

// Keyboard shortcut: Ctrl+F
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    // focus search input via Toolbar
    const searchInput = document.querySelector('.search-input');
    if (searchInput) searchInput.focus();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  loadModels();
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

// Events
function onTextSelected(text) {
  selectedText.value = text;
}
function togglePanel() {
  showPanel.value = !showPanel.value;
}
function onPanelClose() {
  showPanel.value = false;
}
function openPanel() {
  showPanel.value = true;
}
</script>

<style scoped>
/* 浮动 AI 按钮 */
.floating-ai-btn {
  position: absolute;
  right: 16px;
  bottom: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-accent);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(108, 99, 255, 0.4);
  z-index: 500;
  transition: all 0.2s ease;
}
.floating-ai-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 24px rgba(108, 99, 255, 0.6);
}
.floating-ai-btn:active {
  transform: scale(0.95);
}

/* Welcome screen */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.welcome-content {
  text-align: center;
  max-width: 300px;
}
.welcome-icon { font-size: 64px; margin-bottom: 16px; }
.welcome-content h2 {
  font-size: 28px; font-weight: 700;
  color: var(--text-primary); margin-bottom: 8px;
}
.welcome-sub {
  font-size: 14px; color: var(--text-secondary); margin-bottom: 4px;
}
.welcome-hint {
  font-size: 12px; color: var(--text-muted); margin-bottom: 24px;
}
.welcome-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 32px;
  background: var(--color-accent);
  color: #fff; border: none; border-radius: 12px;
  font-size: 16px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
  box-shadow: 0 4px 16px rgba(108, 99, 255, 0.4);
}
.welcome-btn:active { background: var(--color-accent-hover); transform: scale(0.97); }

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg-root);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: #fff;
  font-size: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Panel slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
