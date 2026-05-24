const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  getFileInfo: (filePath) => ipcRenderer.invoke('file:getInfo', filePath),
  summarize: (text, model) => ipcRenderer.invoke('ai:summarize', text, model),
  translate: (text, lang, model) => ipcRenderer.invoke('ai:translate', text, lang, model),
  generateQuiz: (text, model) => ipcRenderer.invoke('ai:quiz', text, model),
  chat: (message, model) => ipcRenderer.invoke('ai:chat', message, model),
  getModelList: () => ipcRenderer.invoke('ai:getModelList'),
  getCurrentModel: () => ipcRenderer.invoke('ai:getCurrentModel'),
  setModel: (modelId) => ipcRenderer.invoke('ai:setModel', modelId),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});