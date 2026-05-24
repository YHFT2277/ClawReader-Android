import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';
import { initCapacitorBridge } from './utils/capacitorBridge.js';

// 初始化主题
const savedTheme = localStorage.getItem('clawreader-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// 初始化 Capacitor 桥接（Android 端）
initCapacitorBridge();

const app = createApp(App);

app.mount('#app');
