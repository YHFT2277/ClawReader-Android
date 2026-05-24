# ClawReader

基于 Electron + Vue 3 的 AI 增强文本与代码阅读器。
支持多种文本格式渲染、文本选择、AI 摘要、翻译、智能出题。

## 功能特性

- 📄 **多格式支持**：TXT、MD、JSON、代码文件（JS/TS/Vue/Python/Java/C/Go 等）
- 🤖 **AI 助手面板**：侧边栏实时对话
- 📝 **智能摘要**：一键生成文档摘要
- 🌐 **文本翻译**：选中文本即时翻译（中/英/日）
- 📝 **智能出题**：根据选中内容自动生成测验题
- 🎨 **暗色主题**：护眼深色 UI

## 安装依赖

```bash
cd C:\Users\17703\Desktop\PDFAI
npm install
```

## 运行开发模式

```bash
npm run dev
```

会同时启动：
- Vite 开发服务器（端口 5173）
- Electron 主进程

## 构建生产版本

```bash
npm run build:win
```

输出在 `dist/` 目录。

## 项目结构

```
ClawReader/
├── main/                # Electron 主进程
│   └── index.js
├── preload/             # 预加载脚本（上下文隔离）
│   └── preload.js
├── renderer/            # Vue 渲染进程
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── components/
│       │   ├── Toolbar.vue
│       │   ├── DocViewer.vue
│       │   └── AiPanel.vue
│       └── assets/
│           └── main.css
├── scripts/
│   └── wait-vite.js    # 等待 Vite 启动后打开 Electron
├── resources/
│   └── icon.ico
├── package.json
└── vite.config.js
```

## 技术栈

- Electron 34
- Vue 3 (Composition API)
- Vite 6
- electron-builder

## 注意事项

- AI 功能需要配置 API Key（`main/ai-config.json`）
- 首次打开大文件时请耐心等待加载完成
