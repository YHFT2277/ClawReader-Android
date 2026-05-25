<template>
  <!-- 顶部导航栏（苹果风格） -->
  <div class="nav-bar">
    <button class="nav-btn" @click="$emit('open-history')" title="最近文件">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </button>
    <div class="nav-title">
      <span class="nav-text">{{ fileInfo.name || 'ClawReader' }}</span>
    </div>
    <div class="nav-actions">
      <button class="nav-btn" @click="toggleTheme" :title="theme === 'dark' ? '浅色模式' : '深色模式'">
        <svg v-if="theme === 'light'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <button class="nav-btn" @click="showFeedback = true" title="反馈">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
    </div>
  </div>

  <!-- 底部工具栏（苹果风格） -->
  <div class="toolbar" v-if="hasFile">
    <div class="tb-left">
      <button class="tb-btn" @click="toggleFavorite" :class="{ active: isFavorite }" title="收藏">
        <svg v-if="isFavorite" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.2 12 2"/></svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.2 12 2"/></svg>
      </button>
    </div>

    <div class="tb-center">
      <button class="tb-btn" @click="changeFontSize(-1)" :disabled="fontSize <= 10" title="缩小字体">A⁻</button>
      <span class="tb-font-label">{{ fontSize }}</span>
      <button class="tb-btn" @click="changeFontSize(1)" :disabled="fontSize >= 24" title="放大字体">A⁺</button>
      <div class="tb-divider"></div>
      <button class="tb-btn" @click="openSearch" title="搜索">🔍</button>
      <button class="tb-btn ai-btn" @click="$emit('togglePanel')" :class="{ active: panelOpen }" title="AI 助手">✨</button>
    </div>

    <div class="tb-right">
      <button class="tb-btn" @click="showMore = !showMore" title="更多">⋯</button>
    </div>

    <!-- 搜索覆盖层 -->
    <div v-if="searchActive" class="search-overlay">
      <div class="search-bar">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          class="search-input"
          ref="searchInputRef"
          v-model="localSearch"
          placeholder="搜索文档内容..."
          @input="onSearchInput"
          @keydown.enter="onSearchNav('next')"
          @keydown.escape="onSearchClose"
        />
        <span v-if="localSearch.trim()" class="search-count">{{ searchIdx + 1 }}/{{ searchCount }}</span>
        <button class="sb-nav" @click="onSearchNav('prev')" :disabled="searchCount === 0" title="上一个">↑</button>
        <button class="sb-nav" @click="onSearchNav('next')" :disabled="searchCount === 0" title="下一个">↓</button>
        <button class="sb-close" @click="onSearchClose" title="关闭">✕</button>
      </div>
    </div>

    <!-- 更多菜单 Sheet -->
    <div v-if="showMore" class="sheet-overlay" @click="onSheetClick">
      <div class="sheet-content">
        <div class="sheet-handle"></div>
        <div class="sheet-title">工具</div>
        <button class="sheet-item" @click="onSheetExport('txt')"><span>📄</span> 导出为 TXT</button>
        <button class="sheet-item" @click="onSheetExport('md')"><span>📝</span> 导出为 Markdown</button>
        <div class="sheet-sep"></div>
        <div class="sheet-title">模型</div>
        <button
          v-for="m in modelList"
          :key="m.id"
          class="sheet-item"
          :class="{ active: currentModel === m.id }"
          @click="onSheetSelectModel(m.id)"
        >
          {{ m.name }}
          <span class="sheet-cost" :class="'cost-' + m.cost">{{ m.cost }}</span>
        </button>
        <div class="sheet-sep"></div>
        <button class="sheet-item cancel" @click="showMore = false">取消</button>
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

const localSearch = ref(props.searchQuery);
const searchInputRef = ref(null);
const isFavorite = ref(false);
const showMore = ref(false);

watch(() => props.searchQuery, (v) => { localSearch.value = v; });

function openSearch() {
  emit('search', '');
  nextTick(() => { searchInputRef.value?.focus(); });
}

function onSearchInput() { emit('search', localSearch.value); }
function onSearchNav(dir) { emit('search-nav', dir); }
function onSearchClose() { localSearch.value = ''; emit('search-close'); }

function toggleTheme() {
  emit('changeTheme', props.theme === 'dark' ? 'light' : 'dark');
}

function toggleFavorite() {
  isFavorite.value = !isFavorite.value;
}

function onSheetClick(e) {
  if (e.target.classList.contains('sheet-overlay')) showMore.value = false;
}

function onSheetExport(format) {
  showMore.value = false;
  emit('exportFile', format);
}

function onSheetSelectModel(modelId) {
  showMore.value = false;
  emit('changeModel', modelId);
}

function changeFontSize(delta) {
  emit('changeFontSize', delta);
}

// 键盘快捷键
function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    openSearch();
  }
}
onMounted(() => { document.addEventListener('keydown', onKeyDown); });
onUnmounted(() => { document.removeEventListener('keydown', onKeyDown); });

// 反馈
const showFeedback = ref(false);
const feedbackContent = ref('');
const feedbackContact = ref('');
const feedbackSending = ref(false);
const feedbackStatus = ref(null);

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
      `提交时间：${new Date().toLocaleString()}`
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
/* ===== 顶部导航栏（苹果风格） ===== */
.nav-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: calc(56px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex; align-items: center; justify-content: space-between;
  padding-left: 12px; padding-right: 12px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid var(--border-default);
  z-index: 200;
  box-sizing: border-box;
}
:root[data-theme='dark'] .nav-bar { background: rgba(0,0,0,0.85); }

.nav-btn {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 8px;
  color: var(--text-secondary); cursor: pointer;
}
.nav-btn:active { background: var(--color-accent-bg); }

.nav-title { flex: 1; text-align: center; overflow: hidden; }
.nav-text {
  font-size: 17px; font-weight: 600;
  color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 60vw; display: inline-block;
}
.nav-actions { display: flex; gap: 4px; }

/* ===== 底部工具栏（苹果风格） ===== */
.toolbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  display: flex; align-items: center; justify-content: space-between;
  padding-left: 12px; padding-right: 12px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 0.5px solid var(--separator);
  z-index: 200;
  box-sizing: border-box;
}
:root[data-theme='dark'] .toolbar { background: rgba(0,0,0,0.88); }

.tb-left, .tb-right { display: flex; align-items: center; width: 56px; }
.tb-right { justify-content: flex-end; }
.tb-center { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; }

.tb-btn {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 10px;
  color: var(--text-primary); cursor: pointer;
  font-size: 16px; font-weight: 600;
  transition: background 0.15s;
}
.tb-btn:active { background: var(--color-accent-bg); }
.tb-btn.active { color: var(--color-accent); }
.tb-btn.active svg { fill: var(--color-accent); }
.tb-btn:disabled { opacity: 0.3; }

.tb-divider { width: 1px; height: 24px; background: var(--separator); margin: 0 4px; }
.tb-font-label {
  font-size: 11px; font-weight: 700; color: var(--text-muted);
  min-width: 20px; text-align: center; user-select: none;
}
.ai-btn { color: var(--color-accent); }
.ai-btn.active { background: var(--color-accent-bg); }

/* 搜索覆盖层 */
.search-overlay {
  position: fixed; bottom: calc(56px + env(safe-area-inset-bottom));
  left: 0; right: 0;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-default);
  z-index: 210;
}
.search-bar {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-input);
  border: 1.5px solid var(--color-accent);
  border-radius: 10px; padding: 6px 10px;
}
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-input {
  flex: 1; border: none; outline: none;
  background: transparent; color: var(--text-primary);
  font-size: 14px; font-family: inherit;
}
.search-input::placeholder { color: var(--text-muted); }
.search-count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.sb-nav {
  width: 28px; height: 28px; border: none;
  background: var(--color-accent-bg); border-radius: 6px;
  cursor: pointer; font-size: 12px; color: var(--color-accent);
}
.sb-nav:disabled { opacity: 0.3; }
.sb-close {
  width: 28px; height: 28px; border: none;
  background: transparent; border-radius: 6px;
  cursor: pointer; font-size: 14px; color: var(--text-muted);
}

/* 更多菜单 Sheet */
.sheet-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 300; display: flex; align-items: flex-end;
}
.sheet-content {
  width: 100%;
  background: var(--bg-elevated);
  border-radius: 16px 16px 0 0;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  max-height: 70vh; overflow-y: auto;
}
.sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: var(--separator); margin: 0 auto 12px;
}
.sheet-title {
  font-size: 13px; font-weight: 600; color: var(--text-muted);
  padding: 4px 20px 8px;
}
.sheet-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 14px 20px;
  border: none; background: transparent;
  font-size: 16px; color: var(--text-primary);
  cursor: pointer; text-align: left;
  font-family: inherit;
}
.sheet-item:active { background: var(--color-accent-bg); }
.sheet-item.active { color: var(--color-accent); font-weight: 600; }
.sheet-cost {
  font-size: 11px; padding: 1px 6px; border-radius: 4px;
  font-weight: 600; margin-left: auto;
}
.cost-低 { background: rgba(34,197,94,0.2); color: #4ade80; }
.cost-中 { background: rgba(234,179,8,0.2); color: #facc15; }
.cost-高 { background: rgba(239,68,68,0.2); color: #f87171; }
.sheet-sep { height: 8px; }
.sheet-item.cancel {
  justify-content: center; color: var(--color-accent);
  font-weight: 600; margin-top: 4px;
  border-top: 0.5px solid var(--separator);
}

/* 反馈弹窗 */
.feedback-overlay {
  position: fixed; inset: 0;
  background: var(--bg-overlay);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.feedback-modal {
  background: var(--bg-elevated); border-radius: 12px;
  width: 100%; max-width: 480px;
  border: 1px solid var(--border-default);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.feedback-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-default);
}
.feedback-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); font-weight: 600; }
.close-btn {
  background: none; border: none; color: var(--text-muted);
  font-size: 24px; cursor: pointer;
  padding: 0; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
}
.close-btn:hover { background: var(--color-accent-bg); color: var(--text-primary); }
.feedback-body { padding: 20px; }
.feedback-desc { margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.feedback-body textarea,
.feedback-body input[type="text"] {
  width: 100%; background: var(--bg-input);
  border: 1px solid var(--border-default); border-radius: 8px;
  padding: 10px 12px; color: var(--text-primary);
  font-family: inherit; font-size: 13px;
  resize: vertical; outline: none; margin-bottom: 12px;
  box-sizing: border-box;
}
.feedback-body textarea:focus,
.feedback-body input[type="text"]:focus { border-color: var(--color-accent); }
.feedback-body textarea::placeholder,
.feedback-body input[type="text"]::placeholder { color: var(--text-muted); }
.feedback-status { padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; }
.feedback-status.success { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.feedback-status.error { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
.feedback-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border-default); }
.feedback-footer .btn { padding: 8px 16px; }

/* 通用按钮（反馈弹窗用） */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: none; border-radius: 6px;
  font-size: 13px; cursor: pointer; transition: all 0.15s ease;
  color: var(--text-secondary); background: transparent;
  font-family: inherit; white-space: nowrap;
}
.btn-primary { background: var(--color-accent); color: var(--text-on-primary); }
.btn-default { background: transparent; }
</style>