/**
 * 文件历史记录管理器
 * 存储最近打开的文件列表，最多 20 条
 */
const STORAGE_KEY = 'clawreader-file-history';
const MAX_ENTRIES = 20;

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