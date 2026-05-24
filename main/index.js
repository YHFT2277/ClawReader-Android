// main/index.js - Electron 主进程
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron/main');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

log.transports.file.level = 'info';
log.info('ClawReader starting...');

let mainWindow;
const isDev = process.argv.includes('--dev');

// AI 配置
const AI_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'ai-config.json'), 'utf-8')
);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    title: 'ClawReader',
    show: false,
    icon: path.join(__dirname, '../resources/icon.svg'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Window ready and shown');
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------- IPC Handlers ----------

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Supported', extensions: ['txt', 'md', 'markdown', 'json', 'js', 'ts', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'php', 'rb', 'sh', 'yaml', 'yml', 'xml', 'sql', 'log', 'docx', 'xlsx', 'pptx'] },
      { name: 'Text Files', extensions: ['txt', 'md', 'markdown', 'json', 'js', 'ts', 'vue', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'php', 'rb', 'sh', 'yaml', 'yml', 'xml', 'sql', 'log'] },
      { name: 'Word', extensions: ['docx'] },
      { name: 'Excel', extensions: ['xlsx'] },
      { name: 'PowerPoint', extensions: ['pptx'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('file:read', async (event, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    // ArrayBuffer 可能 byteOffset > 0，IPC 结构化克隆会丢失偏移
    // 必须切到正确范围，否则解析失败
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return { success: true, data };
  } catch (e) {
    log.error('File read error:', e.message);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('file:getInfo', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
    };
  } catch (e) {
    return { name: '', path: '', size: 0 };
  }
});

ipcMain.handle('file:save', async (event, { defaultName, content, filters }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'Text Files', extensions: ['txt'] }],
  });
  if (result.canceled) return { success: false, canceled: true };
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------- AI Handlers ----------

let currentModel = AI_CONFIG.model;

async function callDeepSeek(messages, timeoutMs = 30000, modelId = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(AI_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId || currentModel,
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
    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('请求超时（30秒），请稍后重试');
    }
    throw err;
  }
}

// ---------- Model Management ----------

ipcMain.handle('ai:getModelList', async () => {
  return {
    success: true,
    models: AI_CONFIG.models || [],
    current: currentModel,
  };
});

ipcMain.handle('ai:getCurrentModel', async () => {
  return { success: true, model: currentModel };
});

ipcMain.handle('ai:setModel', async (event, modelId) => {
  const valid = (AI_CONFIG.models || []).some(m => m.id === modelId);
  if (!valid) {
    return { success: false, error: '无效的模型ID' };
  }
  currentModel = modelId;
  log.info('Model switched to:', modelId);
  return { success: true, model: modelId };
});

// ---------- AI Handlers (with model param) ----------

ipcMain.handle('ai:summarize', async (event, text, modelId) => {
  try {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 20) {
      return { success: true, summary: '文档内容过短，无法生成有效摘要。' };
    }

    const prompt = `请为以下文档内容生成一段简洁的中文摘要（200字以内）：
${text.slice(0, 3000)}`;

    const result = await callDeepSeek([
      { role: 'system', content: '你是一个专业的文档摘要助手。请用简洁的中文回复。' },
      { role: 'user', content: prompt }
    ], 30000, modelId);

    return { success: true, summary: result, wordCount: words.length };
  } catch (err) {
    log.error('AI summarize error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai:translate', async (event, text, targetLang, modelId) => {
  try {
    const langMap = { 'en': '英文', 'zh': '中文', 'ja': '日文', 'ko': '韩文', 'fr': '法文', 'de': '德文' };
    const target = langMap[targetLang] || targetLang;

    const prompt = `将以下文本翻译成${target}，只输出翻译结果，不要解释：

${text.slice(0, 2000)}`;

    const result = await callDeepSeek([
      { role: 'system', content: `你是一个专业的${target}翻译助手。只输出翻译内容，不要添加任何说明。` },
      { role: 'user', content: prompt }
    ], 30000, modelId);

    return { success: true, translated: result };
  } catch (err) {
    log.error('AI translate error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('ai:quiz', async (event, text, modelId) => {
  try {
    const words = text.split(/\s+/).filter(Boolean);
    const num = Math.max(1, Math.min(Math.floor(words.length / 80), 5));

    const prompt = `根据以下文档内容，生成 ${num} 道选择题（每道4个选项）。请严格按以下JSON格式返回，不要有任何额外文字：[
  {
    "question": "题目内容",
    "options": ["A选项", "B选项", "C选项", "D选项"],
    "answer": 0
  }
]

文档内容：${text.slice(0, 3000)}`;

    const raw = await callDeepSeek([
      { role: 'system', content: '你是一个教育助手。请严格按照JSON数组格式输出选择题，不要添加markdown代码块或其他任何文字。' },
      { role: 'user', content: prompt }
    ], 30000, modelId);

    // 提取JSON（处理可能的markdown代码块包裹）
    let jsonStr = raw.trim();
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

    // 重新编号（answer 保持原数组索引）
    const numbered = questions.map((q, i) => ({
      id: i + 1,
      question: q.question,
      options: q.options.map((o, j) => {
        const prefix = ['A', 'B', 'C', 'D'][j] || String.fromCharCode(65 + j);
        const isCorrect = j === q.answer;
        return `${prefix}. ${o}${isCorrect ? ' ✓' : ''}`;
      }),
      answer: q.answer,
    }));

    return { success: true, questions: numbered };
  } catch (err) {
    log.error('AI quiz error:', err.message);
    return { success: false, error: err.message };
  }
});

// 通用聊天接口
ipcMain.handle('ai:chat', async (event, message, modelId) => {
  try {
    const result = await callDeepSeek([
      { role: 'system', content: '你是 ClawReader 的 AI 助手。你擅长文本和代码分析、翻译、摘要和问答。请用中文回复，简洁专业。如果用户的问题与当前打开的文档相关，结合文档上下文回答。' },
      { role: 'user', content: message }
    ], 30000, modelId);
    return { success: true, reply: result };
  } catch (err) {
    log.error('AI chat error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
});

// ---------- App Lifecycle ----------

app.whenReady().then(() => {
  console.log('[main] app ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});