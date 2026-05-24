// Capacitor Bridge - 兼容 Electron 和 Android
// 在 Android 端提供与 electronAPI 相同的接口

const IS_ANDROID = typeof Capacitor !== 'undefined';

// 模拟 electronAPI 接口
export function initCapacitorBridge() {
  if (!IS_ANDROID || window.electronAPI) return;

  console.log('[CapacitorBridge] Initializing Android bridge...');

  window.electronAPI = {
    // 文件选择 - Android 使用 input[type=file]
    async openFile() {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.md,.json,.js,.ts,.vue,.html,.css,.py,.java,.c,.cpp,.h,.go,.rs,.php,.rb,.sh,.yaml,.yml,.xml,.sql,.log,.docx,.xlsx,.pptx';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            // 存储文件引用供 readFile 使用
            window._selectedFile = file;
            resolve(file.name);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    },

    // 读取文件 - Android 使用 FileReader
    async readFile(filePath) {
      const file = window._selectedFile;
      if (!file) {
        return { success: false, error: 'No file selected' };
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target.result;
          resolve({ success: true, data: arrayBuffer });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Failed to read file' });
        };
        reader.readAsArrayBuffer(file);
      });
    },

    // 文件信息
    async getFileInfo(filePath) {
      const file = window._selectedFile;
      if (!file) {
        return { name: '', path: '', size: 0 };
      }
      return {
        name: file.name,
        path: file.name,
        size: file.size,
      };
    },

    // AI 功能 - Android 直接调用 DeepSeek API
    async summarize(text) {
      return callDeepSeekAPI('summarize', text);
    },

    async translate(text, lang) {
      return callDeepSeekAPI('translate', text, lang);
    },

    async generateQuiz(text) {
      return callDeepSeekAPI('quiz', text);
    },

    async chat(message) {
      return callDeepSeekAPI('chat', message);
    },

    // 打开外部链接
    async openExternal(url) {
      window.open(url, '_blank');
    },
  };

  console.log('[CapacitorBridge] Bridge initialized');
}

// 直接调用 DeepSeek API（Android 端）
async function callDeepSeekAPI(type, content, extra = null) {
  const API_KEY = 'sk-8a1eec7d671c445b99cb139fc797a8a7';
  const BASE_URL = 'https://api.deepseek.com/chat/completions';
  const MODEL = 'deepseek-chat';

  let messages = [];

  switch (type) {
    case 'summarize':
      messages = [
        { role: 'system', content: '你是一个专业的文档摘要助手。请用简洁的中文回复。' },
        { role: 'user', content: `请为以下文档内容生成一段简洁的中文摘要（200字以内）：\n${content.slice(0, 3000)}` }
      ];
      break;

    case 'translate':
      const langMap = { 'en': '英文', 'zh': '中文', 'ja': '日文', 'ko': '韩文', 'fr': '法文', 'de': '德文' };
      const target = langMap[extra] || extra;
      messages = [
        { role: 'system', content: `你是一个专业的${target}翻译助手。只输出翻译内容，不要添加任何说明。` },
        { role: 'user', content: `将以下文本翻译成${target}，只输出翻译结果，不要解释：\n\n${content.slice(0, 2000)}` }
      ];
      break;

    case 'quiz':
      const words = content.split(/\s+/).filter(Boolean);
      const num = Math.max(1, Math.min(Math.floor(words.length / 80), 5));
      messages = [
        { role: 'system', content: '你是一个教育助手。请严格按照JSON数组格式输出选择题，不要添加markdown代码块或其他任何文字。' },
        { role: 'user', content: `根据以下文档内容，生成 ${num} 道选择题（每道4个选项）。请严格按以下JSON格式返回，不要有任何额外文字：[{"question":"题目内容","options":["A选项","B选项","C选项","D选项"],"answer":0}]\n\n文档内容：${content.slice(0, 3000)}` }
      ];
      break;

    case 'chat':
    default:
      messages = [
        { role: 'system', content: '你是 ClawReader 的 AI 助手。你擅长文本和代码分析、翻译、摘要和问答。请用中文回复，简洁专业。' },
        { role: 'user', content: content }
      ];
      break;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API错误 ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    // 根据类型返回不同格式
    switch (type) {
      case 'summarize':
        return { success: true, summary: result };
      case 'translate':
        return { success: true, translated: result };
      case 'quiz':
        // 解析 JSON
        let jsonStr = result.trim();
        const fence = jsonStr.indexOf('```json');
        if (fence !== -1) {
          const start = jsonStr.indexOf('[', fence);
          const end = jsonStr.lastIndexOf(']');
          if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);
        } else {
          const start = jsonStr.indexOf('[');
          const end = jsonStr.lastIndexOf(']');
          if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);
        }
        const questions = JSON.parse(jsonStr);
        const numbered = questions.map((q, i) => ({
          id: i + 1,
          question: q.question,
          options: q.options.map((o, j) => {
            const prefix = ['A', 'B', 'C', 'D'][j] || String.fromCharCode(65 + j);
            return `${prefix}. ${o}`;
          }),
          answer: q.answer,
        }));
        return { success: true, questions: numbered };
      case 'chat':
      default:
        return { success: true, reply: result };
    }
  } catch (err) {
    console.error('[CapacitorBridge] API error:', err);
    return { success: false, error: err.message };
  }
}
