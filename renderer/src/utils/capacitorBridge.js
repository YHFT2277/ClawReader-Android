// capacitorBridge.js — 兼容 Electron 和 Android
// 在 Android 端提供与 electronAPI 相同的接口

// DeepSeek 配置（与 main/ai-config.json 保持一致）
const AI_CONFIG = {
  apiKey: 'sk-8a1eec7d671c445b99cb139fc797a8a7',
  baseUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-chat',
  timeoutMs: 30000,
  models: [
    { id: 'deepseek-v4-flash', name: 'V4 Flash', desc: '速度快、便宜，日常首选', cost: '低' },
    { id: 'deepseek-v4-flash-thinking', name: 'V4 Flash (思考)', desc: '带推理过程，适合复杂问题', cost: '中' },
    { id: 'deepseek-v4-pro', name: 'V4 Pro', desc: '最强模型', cost: '高' },
  ],
};

export function initCapacitorBridge() {
  // Electron preload 已经设置了 electronAPI，直接返回
  if (window.electronAPI) return;

  console.log('[CapacitorBridge] Setting up mobile bridge...');

  // ---- 文件操作 ----
  let _selectedFile = null;
  let _fileResolve = null;

  // 创建持久化隐藏 file input（只创建一次）
  function _ensureFileInput() {
    let el = document.getElementById('__cr_file_input__');
    if (el) return el;
    el = document.createElement('input');
    el.type = 'file';
    el.id = '__cr_file_input__';
    el.accept = '.txt,.md,.json,.js,.ts,.vue,.html,.css,.py,.java,.c,.cpp,.h,.go,.rs,.php,.rb,.sh,.yaml,.yml,.xml,.sql,.log,.docx,.xlsx,.pptx,.pdf';
    // 不用 display:none（某些 WebView 会拦截），用透明+定位移出视口
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;pointer-events:auto;';
    el.addEventListener('change', () => {
      const file = el.files[0];
      if (file) {
        _selectedFile = file;
        if (_fileResolve) { _fileResolve(file.name); _fileResolve = null; }
      } else {
        if (_fileResolve) { _fileResolve(null); _fileResolve = null; }
      }
    });
    document.body.appendChild(el);
    return el;
  }

  async function _pickFile() {
    const input = _ensureFileInput();
    return new Promise((resolve) => {
      _fileResolve = resolve;
      // 重置 value 以便同一文件可重复选择
      input.value = '';
      // 使用原生 click 触发
      input.click();
      // 超时保护：30s 无响应视为取消
      setTimeout(() => {
        if (_fileResolve === resolve) { resolve(null); _fileResolve = null; }
      }, 30000);
    });
  }

  async function _readSelectedFile() {
    const file = _selectedFile;
    if (!file) return { success: false, error: 'No file selected' };
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ success: true, data: reader.result });
      reader.onerror = () => resolve({ success: false, error: 'Read failed' });
      reader.readAsArrayBuffer(file);
    });
  }

  // ---- AI 调用 ----
  async function _callAI(type, content, extra = null) {
    const apiKey = AI_CONFIG.apiKey;
    const baseUrl = AI_CONFIG.baseUrl;
    const model = AI_CONFIG.model;

    let messages = [];
    switch (type) {
      case 'summarize':
        messages = [
          { role: 'system', content: '你是专业的文档摘要助手。请用简洁的中文回复，200字以内。' },
          { role: 'user', content: `请为以下文档内容生成摘要：\n${content.slice(0, 3000)}` },
        ];
        break;
      case 'translate': {
        const langMap = { en: '英文', zh: '中文', ja: '日文', ko: '韩文', fr: '法文', de: '德文' };
        const target = langMap[extra] || extra;
        messages = [
          { role: 'system', content: `你是专业的${target}翻译助手。只输出翻译内容，不要添加任何说明。` },
          { role: 'user', content: `将以下文本翻译成${target}：\n${content.slice(0, 2000)}` },
        ];
        break;
      }
      case 'quiz': {
        const num = Math.max(1, Math.min(Math.floor(content.split(/\s+/).length / 80), 5));
        messages = [
          { role: 'system', content: '请严格按照JSON数组格式输出，不要有任何其他文字。' },
          { role: 'user', content: `根据以下内容生成${num}道选择题，格式：[{"question":"题目","options":["A","B","C","D"],"answer":0}]\n\n${content.slice(0, 3000)}` },
        ];
        break;
      }
      case 'chat':
      default:
        messages = [
          { role: 'system', content: '你是 ClawReader 的 AI 助手，擅长文本分析。请用中文简洁回复。' },
          { role: 'user', content: content },
        ];
        break;
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), AI_CONFIG.timeoutMs);
      const resp = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.7 }),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      const data = await resp.json();
      const text = data.choices[0].message.content;

      if (type === 'summarize') return { success: true, summary: text };
      if (type === 'translate') return { success: true, translated: text };
      if (type === 'quiz') {
        let jsonStr = text.trim();
        const f1 = jsonStr.indexOf('```json');
        const f2 = jsonStr.indexOf('```');
        if (f1 !== -1) {
          jsonStr = jsonStr.slice(jsonStr.indexOf('[', f1), jsonStr.indexOf(']', f1) + 1);
        } else if (f2 !== -1) {
          jsonStr = jsonStr.slice(jsonStr.indexOf('[', f2), jsonStr.lastIndexOf(']') + 1);
        } else {
          const s = jsonStr.indexOf('[');
          const e = jsonStr.lastIndexOf(']');
          if (s !== -1 && e !== -1) jsonStr = jsonStr.slice(s, e + 1);
        }
        const qs = JSON.parse(jsonStr);
        const numbered = qs.map((q, i) => ({
          id: i + 1,
          question: q.question,
          options: q.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`),
          answer: q.answer,
        }));
        return { success: true, questions: numbered };
      }
      return { success: true, reply: text };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ---- 共享文件处理（Android intent / Open With）----
  window.addEventListener('clawreader:sharedFile', (e) => {
    const { name, content } = e.detail || {};
    if (!name || !content) return;
    console.log('[CapacitorBridge] 收到共享文件:', name, content.length, 'chars');

    // 创建 File 对象模拟用户选择
    _selectedFile = new File([content], name, { type: 'text/plain' });

    // 通知 App.vue 自动加载
    window.dispatchEvent(new CustomEvent('clawreader:fileReady', {
      detail: { fileName: name, content },
    }));
  });

  // ---- 挂载 window.electronAPI ----
  window.electronAPI = {

    // 文件 — openFile 返回文件名（字符串），与 Electron preload 行为一致
    async openFile() { return _pickFile(); },
    async readFile() { return _readSelectedFile(); },
    async getFileInfo() {
      if (!_selectedFile) return { name: '', path: '', size: 0 };
      return { name: _selectedFile.name, path: _selectedFile.name, size: _selectedFile.size };
    },
    async saveFile({ defaultName, content, filters }) {
      try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName || 'export.txt';
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, path: defaultName };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    // AI
    async summarize(text) { return _callAI('summarize', text); },
    async translate(text, lang) { return _callAI('translate', text, lang); },
    async generateQuiz(text) { return _callAI('quiz', text); },
    async chat(message) { return _callAI('chat', message); },

    // 模型
    async getModelList() {
      const saved = localStorage.getItem('clawreader-model') || '';
      return { success: true, models: AI_CONFIG.models, current: saved };
    },
    async getCurrentModel() {
      return { success: true, modelId: localStorage.getItem('clawreader-model') || AI_CONFIG.models[0].id };
    },
    async setModel(modelId) {
      localStorage.setItem('clawreader-model', modelId);
      return { success: true };
    },

    // 其他
    async openExternal(url) { window.open(url, '_blank'); },
  };

  console.log('[CapacitorBridge] ✅ Bridge ready');
}
