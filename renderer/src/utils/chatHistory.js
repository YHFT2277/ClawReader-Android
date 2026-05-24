/**
 * AI 对话历史持久化
 * 按文件路径存储，关闭面板后恢复
 */
const STORAGE_KEY = 'clawreader-chat-history';
const MAX_MESSAGES = 50;

/**
 * 加载某个文件的对话历史
 * @param {string} filePath
 * @returns {Array}
 */
export function loadChatHistory(filePath) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    return all[filePath]?.messages || [];
  } catch {
    return [];
  }
}

/**
 * 保存某个文件的对话历史
 * @param {string} filePath
 * @param {Array} messages
 */
export function saveChatHistory(filePath, messages) {
  if (!filePath) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    // 限制条数
    const trimmed = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
    all[filePath] = { messages: trimmed, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage 满了就清掉旧记录的旧数据
    console.warn('[Chat History] storage full, clearing old entries');
    // noop — 不丢新消息
  }
}

/**
 * 删除某个文件的对话历史
 * @param {string} filePath
 */
export function clearChatHistory(filePath) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    delete all[filePath];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}