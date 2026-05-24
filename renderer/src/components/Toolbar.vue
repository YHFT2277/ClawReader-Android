<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <button class="btn btn-primary" @click="$emit('openFile')" title="打开文件（支持文本、Word、Excel、PPT）">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
        <span>打开文件</span>
      </button>

      <div v-if="fileInfo.name" class="file-name" :title="fileInfo.path">
        {{ fileInfo.name }}
        <span v-if="fileInfo.docLabel" class="doc-badge" :style="{ backgroundColor: fileInfo.docColor || '#6c63ff' }">
          {{ fileInfo.docLabel }}
        </span>
      </div>
    </div>

    <!-- 搜索栏（内联显示） -->
    <div class="toolbar-center" v-if="hasFile">
      <template v-if="searchActive">
        <div class="search-bar">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            class="search-input"
            ref="searchInputRef"
            v-model="localSearch"
            :placeholder="'搜索文档内容...'"
            @input="onSearchInput"
            @keydown.enter="onSearchNav('next')"
            @keydown.escape="onSearchClose"
          />
          <span v-if="localSearch.trim()" class="search-count">{{ searchIdx + 1 }}/{{ searchCount }}</span>
          <button class="btn btn-icon btn-search-nav" @click="onSearchNav('prev')" :disabled="searchCount === 0" title="上一个 (Shift+Enter)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button class="btn btn-icon btn-search-nav" @click="onSearchNav('next')" :disabled="searchCount === 0" title="下一个 (Enter)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button class="btn btn-icon btn-search-close" @click="onSearchClose" title="关闭搜索 (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </template>
      <span v-else class="file-meta">
        {{ formatSize(fileInfo.size) }}
        <span v-if="fileInfo.docType" class="doc-type">{{ fileInfo.docLabel }}</span>
      </span>
    </div>

    <div class="toolbar-right">
      <!-- 字体大小 -->
      <button v-if="hasFile" class="btn btn-icon" @click="changeFontSize(-1)" title="缩小字体" :disabled="fontSize <= 10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      </button>
      <span v-if="hasFile" class="font-size-label" :title="'字体大小: ' + fontSize + 'px'">{{ fontSize }}</span>
      <button v-if="hasFile" class="btn btn-icon" @click="changeFontSize(1)" title="放大字体" :disabled="fontSize >= 24">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      </button>

      <!-- 搜索按钮 -->
      <button v-if="hasFile && !searchActive" class="btn btn-icon" @click="openSearch" title="搜索文档 (Ctrl+F)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      <button class="btn btn-icon" @click="showFeedback = true" title="用户反馈">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      </button>
      <!-- 模型选择器 -->
      <div class="model-selector" v-if="modelList.length">
        <button class="btn btn-icon model-btn" @click="showModelMenu = !showModelMenu" :title="'当前模型: ' + currentModelName">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span class="model-cost" :class="'cost-' + currentModelCost">{{ currentModelCost }}</span>
        </button>
        <div v-if="showModelMenu" class="model-menu">
          <div class="model-menu-header">选择 AI 模型</div>
          <div
            v-for="m in modelList"
            :key="m.id"
            class="model-item"
            :class="{ active: currentModel === m.id }"
            @click="selectModel(m.id)"
          >
            <div class="model-name">{{ m.name }}</div>
            <div class="model-desc">{{ m.desc }}</div>
            <span class="model-cost-tag" :class="'cost-' + m.cost">{{ m.cost }}</span>
          </div>
        </div>
      </div>

      <button class="btn btn-icon" @click="toggleTheme" :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'">
        <svg v-if="theme === 'light'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
      <button class="btn" :class="panelOpen ? 'btn-active' : 'btn-default'" @click="$emit('togglePanel')" title="ClawReader AI 面板">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>AI 助手</span>
      </button>

      <!-- 导出按钮 -->
      <div class="export-selector" v-if="hasFile">
        <button class="btn btn-icon" @click="showExportMenu = !showExportMenu" title="导出文档">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <div v-if="showExportMenu" class="export-menu">
          <div class="export-menu-header">导出格式</div>
          <div class="export-item" @click="doExport('txt')">
            <span>📄</span> 纯文本 (.txt)
          </div>
          <div class="export-item" @click="doExport('md')">
            <span>📝</span> Markdown (.md)
          </div>
        </div>
      </div>
    </div>

    <!-- 反馈弹窗 -->
    <div v-if="showFeedback" class="feedback-overlay" @click.self="showFeedback = false">
      <div class="feedback-modal">
        <div class="feedback-header">
          <h3>用户反馈</h3>
          <button class="close-btn" @click="showFeedback = false">&times;</button>
        </div>
        <div class="feedback-body">
          <p class="feedback-desc">遇到问题或有建议？请告诉我们，我们会尽快改进。</p>
          <textarea v-model="feedbackContent" placeholder="请描述您遇到的问题或建议..." rows="5" />
          <input v-model="feedbackContact" placeholder="联系方式（邮箱/微信，可选）" type="text" />
          <div v-if="feedbackStatus" class="feedback-status" :class="feedbackStatus.type">
            {{ feedbackStatus.message }}
          </div>
        </div>
        <div class="feedback-footer">
          <button class="btn btn-default" @click="showFeedback = false">取消</button>
          <button class="btn btn-primary" :disabled="!feedbackContent.trim() || feedbackSending" @click="submitFeedback">
            {{ feedbackSending ? '发送中...' : '提交反馈' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';

const emit = defineEmits([
  'openFile', 'togglePanel', 'changeTheme',
  'search', 'search-nav', 'search-close',
  'open-history', 'changeModel', 'changeFontSize',
  'exportFile',
]);

const props = defineProps({
  fileInfo: { type: Object, default: () => ({ name: '', path: '', size: 0 }) },
  hasFile: { type: Boolean, default: false },
  panelOpen: { type: Boolean, default: true },
  theme: { type: String, default: 'dark' },
  searchActive: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
  searchCount: { type: Number, default: 0 },
  searchIdx: { type: Number, default: 0 },
  modelList: { type: Array, default: () => [] },
  currentModel: { type: String, default: '' },
  fontSize: { type: Number, default: 14 },
});

// Local search state
const localSearch = ref(props.searchQuery);
const searchInputRef = ref(null);

// Watch props -> local
watch(() => props.searchQuery, (v) => { localSearch.value = v; });

function openSearch() {
  emit('search', '');
  nextTick(() => { searchInputRef.value?.focus(); });
}

function onSearchInput() {
  emit('search', localSearch.value);
}

function onSearchNav(dir) {
  emit('search-nav', dir);
}

function onSearchClose() {
  localSearch.value = '';
  emit('search-close');
}

// Theme toggle
function toggleTheme() {
  const next = props.theme === 'dark' ? 'light' : 'dark';
  emit('changeTheme', next);
}

// 模型选择
const showModelMenu = ref(false);
const currentModelName = computed(() => {
  const m = props.modelList.find(x => x.id === props.currentModel);
  return m ? m.name : props.currentModel;
});
const currentModelCost = computed(() => {
  const m = props.modelList.find(x => x.id === props.currentModel);
  return m ? m.cost : '低';
});

function selectModel(modelId) {
  showModelMenu.value = false;
  emit('changeModel', modelId);
}

// 点击外部关闭模型菜单和导出菜单
function onDocClick(e) {
  if (!e.target.closest('.model-selector') && !e.target.closest('.export-selector')) {
    showModelMenu.value = false;
    showExportMenu.value = false;
  }
}
onMounted(() => {
  document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});

// 字体大小调节
function changeFontSize(delta) {
  emit('changeFontSize', delta);
}

// 导出
const showExportMenu = ref(false);
function doExport(format) {
  showExportMenu.value = false;
  emit('exportFile', format);
}

// 反馈相关状态
const showFeedback = ref(false);
const feedbackContent = ref('');
const feedbackContact = ref('');
const feedbackSending = ref(false);
const feedbackStatus = ref(null);

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function submitFeedback() {
  if (!feedbackContent.value.trim()) return;
  feedbackSending.value = true;
  feedbackStatus.value = null;
  try {
    const subject = encodeURIComponent('ClawReader 用户反馈');
    const body = encodeURIComponent(
      `反馈内容：\n${feedbackContent.value}\n\n` +
      `联系方式：${feedbackContact.value || '未填写'}\n` +
      `应用版本：ClawReader Android\n` +
      `提交时间：${new Date().toLocaleString()}\n` +
      `用户代理：${navigator.userAgent}`
    );
    const mailtoUrl = `mailto:1770319874@qq.com?subject=${subject}&body=${body}`;
    if (window.electronAPI?.openExternal) {
      await window.electronAPI.openExternal(mailtoUrl);
    } else {
      window.location.href = mailtoUrl;
    }
    feedbackStatus.value = { type: 'success', message: '已打开邮件客户端，请发送邮件完成反馈。感谢您的建议！' };
    setTimeout(() => { feedbackContent.value = ''; feedbackContact.value = ''; }, 500);
  } catch (err) {
    feedbackStatus.value = { type: 'error', message: '发送失败：' + err.message };
  } finally {
    feedbackSending.value = false;
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
  gap: 8px;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-input);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  padding: 4px 8px;
  max-width: 400px;
  width: 100%;
}

.search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-count {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 32px;
  text-align: center;
}

.btn-search-nav,
.btn-search-close {
  padding: 3px;
  min-width: 24px;
  min-height: 24px;
  border-radius: 4px;
}

.btn-search-close {
  color: var(--text-muted);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  white-space: nowrap;
}
.btn:hover {
  background: var(--color-accent-bg);
  color: var(--text-primary);
}

.btn-primary { background: var(--color-accent); color: var(--text-on-primary); }
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-active { background: var(--color-accent-bg); color: var(--color-accent); }
.btn-default { background: transparent; }

.btn-icon {
  padding: 6px;
  border-radius: 6px;
  min-width: 32px;
  min-height: 32px;
  justify-content: center;
}

.font-size-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  user-select: none;
}

.file-name {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.file-meta {
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
}

.doc-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #fff;
  margin-left: 6px;
  font-weight: 500;
}

.doc-type {
  margin-left: 8px;
  padding: 1px 6px;
  background: var(--color-accent-bg);
  border-radius: 3px;
  color: var(--color-accent);
}

/* Feedback Modal */
.feedback-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.feedback-modal {
  background: var(--bg-elevated);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  border: 1px solid var(--border-default);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-default);
}
.feedback-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.close-btn:hover { background: var(--color-accent-bg); color: var(--text-primary); }

.feedback-body { padding: 20px; }

.feedback-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.feedback-body textarea,
.feedback-body input[type="text"] {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  resize: vertical;
  outline: none;
  margin-bottom: 12px;
  box-sizing: border-box;
}
.feedback-body textarea:focus,
.feedback-body input[type="text"]:focus { border-color: var(--color-accent); }
.feedback-body textarea::placeholder,
.feedback-body input[type="text"]::placeholder { color: var(--text-muted); }

.feedback-status { padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; }
.feedback-status.success { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.feedback-status.error { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-default);
}
.feedback-footer .btn { padding: 8px 16px; }

/* Model Selector */
.model-selector {
  position: relative;
}
.model-btn {
  position: relative;
}
.model-cost {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  padding: 0 3px;
  border-radius: 3px;
  font-weight: 600;
  line-height: 12px;
}
.cost-低 { background: rgba(34,197,94,0.2); color: #4ade80; }
.cost-中 { background: rgba(234,179,8,0.2); color: #facc15; }
.cost-高 { background: rgba(239,68,68,0.2); color: #f87171; }

.model-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 8px;
  min-width: 220px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  z-index: 100;
}
.model-menu-header {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 8px 8px;
  border-bottom: 1px solid var(--border-default);
  margin-bottom: 4px;
}
.model-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.model-item:hover {
  background: var(--color-accent-bg);
}
.model-item.active {
  background: var(--color-accent-bg);
}
.model-item.active::before {
  content: '✓';
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-accent);
  font-size: 12px;
}
.model-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  padding-left: 14px;
}
.model-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  padding-left: 14px;
}
.model-cost-tag {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
}

/* Export Selector */
.export-selector {
  position: relative;
}
.export-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  padding: 8px;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.4);
  z-index: 100;
}
.export-menu-header {
  font-size: 11px;
  color: var(--text-muted);
  padding: 4px 8px 8px;
  border-bottom: 1px solid var(--border-default);
  margin-bottom: 4px;
}
.export-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s;
}
.export-item:hover {
  background: var(--color-accent-bg);
}
</style>