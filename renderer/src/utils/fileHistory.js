/**
 * 文件历史记录管理器
 * 存储最近打开的文件列表，最多 20 条
 * 同时管理收藏和阅读进度
 */
const STORAGE_KEY = 'clawreader-file-history';
const FAVORITES_KEY = 'clawreader-favorites';
const PROGRESS_KEY = 'clawreader-progress';
const MAX_ENTRIES = 20;
const MAX_FAVORITES = 50;

/**
 * 获取文件历史列表
 * @returns {Array<{name:string, path:string, size:number, time:number}>}
 */
export function getFileHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 记录一个文件到历史（去重 + 置顶）
 * @param {{name:string, path:string, size:number}} file
 */
export function addFileHistory(file) {
  const list = getFileHistory();
  // 去重：移除同路径的旧记录
  const filtered = list.filter(f => f.path !== file.path);
  // 新记录放最前面
  filtered.unshift({ ...file, time: Date.now() });
  // 限制条目数
  if (filtered.length > MAX_ENTRIES) filtered.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * 清空历史
 */
export function clearFileHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 收藏管理
 */

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch { return []; }
}

export function isFavorite(path) {
  return getFavorites().some(f => f.path === path);
}

export function toggleFavorite(file) {
  const list = getFavorites();
  const idx = list.findIndex(f => f.path === file.path);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.unshift({ name: file.name, path: file.path, time: Date.now() });
    if (list.length > MAX_FAVORITES) list.length = MAX_FAVORITES;
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  return idx < 0; // true = 已收藏, false = 已取消
}

/**
 * 阅读进度管理（按文件路径存储 scrollTop 和 totalHeight）
 */

export function getReadingProgress(path) {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    return all[path] || null;
  } catch { return null; }
}

export function saveReadingProgress(path, scrollTop, totalHeight) {
  if (!path) return;
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    all[path] = { scrollTop, totalHeight, time: Date.now() };
    // 只保留最近 100 个文件的进度
    const keys = Object.keys(all);
    if (keys.length > 100) {
      const sorted = keys.sort((a, b) => all[b].time - all[a].time);
      for (const k of sorted.slice(100)) delete all[k];
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * 格式化时间显示
 * @param {number} timestamp
 * @returns {string}
 */
export function formatHistoryTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return Math.floor(diff / 60_000) + '分钟前';
  if (diff < 86400_000) return Math.floor(diff / 3600_000) + '小时前';
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}