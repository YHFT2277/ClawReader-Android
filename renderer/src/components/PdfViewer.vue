<template>
  <div class="pdf-viewer" ref="containerRef">
    <!-- Loading -->
    <div v-if="loading" class="pdf-loading">
      <div class="spinner"></div>
      <p>加载 PDF 中...</p>
      <p class="pdf-progress" v-if="loadProgress">{{ loadProgress }}</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="pdf-error">
      <p>❌ {{ error }}</p>
    </div>

    <!-- Pages -->
    <div v-if="!loading && !error" class="pdf-pages">
      <div v-for="(page, i) in pages" :key="i" class="pdf-page-wrapper">
        <canvas
          :ref="el => setCanvasRef(el, i)"
          class="pdf-canvas"
        ></canvas>
        <span class="pdf-page-num">第 {{ i + 1 }} / {{ pages.length }} 页</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// Disable worker — render on main thread (avoids Vite worker path issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const props = defineProps({
  pdfData: { type: ArrayBuffer, default: null },
  fileName: { type: String, default: '' },
});

const containerRef = ref(null);
const loading = ref(false);
const error = ref('');
const loadProgress = ref('');
const pages = ref([]);
const canvasRefs = [];

function setCanvasRef(el, i) {
  if (el) canvasRefs[i] = el;
}

let pdfDoc = null;

async function loadPdf() {
  if (!props.pdfData) return;

  // Reset
  loading.value = true;
  error.value = '';
  pages.value = [];
  loadProgress.value = '';

  try {
    pdfDoc = await pdfjsLib.getDocument({
      data: props.pdfData,
      disableAutoFetch: false,
      disableStream: false,
      disableRange: false,
    }).promise;

    const total = pdfDoc.numPages;
    pages.value = new Array(total).fill(null);
    loadProgress.value = `共 ${total} 页，渲染中...`;

    // Render pages sequentially to avoid overwhelming the WebView
    for (let i = 1; i <= total; i++) {
      loadProgress.value = `渲染第 ${i}/${total} 页...`;
      await nextTick();
      await renderPage(i);
    }

    loadProgress.value = '';
    loading.value = false;

    console.log(`[PdfViewer] PDF loaded: ${total} pages`);
  } catch (e) {
    console.error('[PdfViewer] Failed to load PDF:', e);
    error.value = 'PDF 加载失败：' + (e.message || '未知错误');
    loading.value = false;
  }
}

async function renderPage(pageNum) {
  if (!pdfDoc) return;

  try {
    const page = await pdfDoc.getPage(pageNum);
    const canvas = canvasRefs[pageNum - 1];
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;
  } catch (e) {
    console.error(`[PdfViewer] Failed to render page ${pageNum}:`, e);
  }
}

// Watch for pdfData changes
watch(() => props.pdfData, (data) => {
  if (data) {
    nextTick(() => loadPdf());
  }
}, { immediate: true });

onUnmounted(() => {
  pdfDoc?.destroy();
  pdfDoc = null;
});
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #525659;
  -webkit-overflow-scrolling: touch;
}

.pdf-loading,
.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ccc;
  font-size: 14px;
  gap: 12px;
}

.pdf-error {
  color: #f87171;
}

.pdf-progress {
  font-size: 12px;
  color: #999;
}

.pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 4px;
}

.pdf-page-wrapper {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  margin-bottom: 4px;
}

.pdf-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.pdf-page-num {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 10px;
  color: #999;
  background: rgba(255,255,255,0.8);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}
</style>