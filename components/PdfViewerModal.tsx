import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface PdfViewerModalProps {
  visible: boolean;
  file: { url: string; name: string } | null;
  onClose: () => void;
}

export default function PdfViewerModal({ visible, file, onClose }: PdfViewerModalProps) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPdf() {
      setError(null);
      if (!file?.url) return;
      try {
        const base64 = await FileSystem.readAsStringAsync(file.url, { encoding: FileSystem.EncodingType.Base64 });
        const docHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { height: 100%; margin: 0; background: #0f172a; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; height: 44px; background: #1f2937; color: #fff; display: flex; align-items: center; padding: 0 12px; font-family: sans-serif; z-index: 10; }
    .title { flex: 1; font-size: 14px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .controls { display: flex; gap: 8px; }
    button { background: #334155; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; }
    #outer { position: absolute; top: 44px; bottom: 0; left: 0; right: 0; overflow: auto; }
    #container { position: relative; padding: 8px; transform-origin: 0 0; }
    .page { display: block; margin: 8px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.4); background: #fff; }
    #hud { position: fixed; bottom: 8px; right: 8px; background:#0b1220a0; color:#fff; padding:4px 8px; border-radius:6px; font-size:12px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    const base64Data = '${base64}';
    function base64ToUint8Array(base64) {
      const raw = atob(base64);
      const uint8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        uint8Array[i] = raw.charCodeAt(i);
      }
      return uint8Array;
    }
    const pdfData = base64ToUint8Array(base64Data);
    let scale = 1.0; // visual scale via CSS transform
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    let pdf = null;
    const pages = []; // cache page canvas and intrinsic sizes
    let maxBaseWidth = 0;
    function fitWidthScale(viewport, containerWidth) {
      const pageWidth = viewport.width;
      return Math.min(containerWidth / pageWidth, 3);
    }
    function getOuter() { return document.getElementById('outer'); }
    function getContainer() { return document.getElementById('container'); }
    function getScrollCenter(container) {
      const rect = container.getBoundingClientRect();
      const centerY = container.scrollTop + rect.height / 2;
      return centerY;
    }
    function restoreScrollToCenter(container, prevCenter) {
      const rect = container.getBoundingClientRect();
      // Clamp within bounds
      const target = Math.max(0, prevCenter - rect.height / 2);
      container.scrollTop = target;
    }
    async function renderInitial() {
      const outer = getOuter();
      const container = getContainer();
      container.innerHTML = '';
      const loadingTask = window['pdfjsLib'].getDocument({ data: pdfData });
      pdf = await loadingTask.promise;
      const containerWidth = outer.clientWidth - 16;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const baseScale = fitWidthScale(viewport, containerWidth);
        const scaledViewport = page.getViewport({ scale: baseScale });
        const canvas = document.createElement('canvas');
        canvas.className = 'page';
        canvas.style.width = Math.floor(scaledViewport.width) + 'px';
        canvas.style.height = Math.floor(scaledViewport.height) + 'px';
        canvas.width = Math.floor(scaledViewport.width * dpr);
        canvas.height = Math.floor(scaledViewport.height * dpr);
        const ctx = canvas.getContext('2d');
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        await page.render({ canvasContext: ctx, viewport: scaledViewport, transform }).promise;
        container.appendChild(canvas);
        pages.push({ canvas, baseWidth: scaledViewport.width, baseHeight: scaledViewport.height, baseScale });
        if (scaledViewport.width > maxBaseWidth) maxBaseWidth = scaledViewport.width;
      }
      applyVisualScale();
      updateHud();
    }

    function applyVisualScale() {
      const container = getContainer();
      container.style.transform = 'scale(' + scale + ')';
      // Adjust container height to accommodate scaled content to keep scroll functional
      const totalHeight = pages.reduce((sum, p) => sum + (p.baseHeight + 16), 0);
      container.style.height = Math.ceil(totalHeight * scale) + 'px';
      // Adjust container width to enable full horizontal scroll visibility
      container.style.width = Math.ceil((maxBaseWidth + 16) * scale) + 'px';
    }
    function zoomIn() { scale = Math.min(scale + 0.15, 4); scheduleRender(); }
    function zoomOut() { scale = Math.max(scale - 0.15, 0.2); scheduleRender(); }
    // Render throttling to avoid excessive reflows during gestures
    let renderScheduled = false;
    function scheduleRender() {
      if (renderScheduled) return;
      renderScheduled = true;
      requestAnimationFrame(() => { renderScheduled = false; applyVisualScale(); updateHud(); });
    }
    // Pinch-zoom support with throttling and minimal scroll interference
    let pinchStartDist = null;
    let lastPinchScale = scale;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
        lastPinchScale = scale;
      }
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStartDist) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const pinchRatio = dist / pinchStartDist;
        const newScale = Math.max(0.2, Math.min(4, lastPinchScale * pinchRatio));
        if (Math.abs(newScale - scale) > 0.03) { scale = newScale; scheduleRender(); }
      }
    }, { passive: false });
    document.addEventListener('touchend', () => { pinchStartDist = null; }, { passive: true });
    document.addEventListener('touchcancel', () => { pinchStartDist = null; }, { passive: true });
    // Double-tap to zoom in/out
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTap < 300) {
          // double tap: toggle zoom
          scale = scale < 1.5 ? Math.min(scale + 0.5, 3) : Math.max(scale - 0.5, 0.8);
          scheduleRender();
        }
        lastTap = now;
      }
    }, { passive: true });
    // Mouse wheel zoom (desktop/web debug)
    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.2, Math.min(4, scale + delta));
        scheduleRender();
      }
    }, { passive: false });
    window.addEventListener('resize', () => {
      // Recompute baseScale for each page on resize and re-render once
      if (!pdf) return;
      const outer = getOuter();
      const container = getContainer();
      const containerWidth = outer.clientWidth - 16;
      (async () => {
        container.innerHTML = '';
        pages.length = 0;
        maxBaseWidth = 0;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1 });
          const baseScale = fitWidthScale(viewport, containerWidth);
          const scaledViewport = page.getViewport({ scale: baseScale });
          const canvas = document.createElement('canvas');
          canvas.className = 'page';
          canvas.style.width = Math.floor(scaledViewport.width) + 'px';
          canvas.style.height = Math.floor(scaledViewport.height) + 'px';
          canvas.width = Math.floor(scaledViewport.width * dpr);
          canvas.height = Math.floor(scaledViewport.height * dpr);
          const ctx = canvas.getContext('2d');
          const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
          await page.render({ canvasContext: ctx, viewport: scaledViewport, transform }).promise;
          container.appendChild(canvas);
          pages.push({ canvas, baseWidth: scaledViewport.width, baseHeight: scaledViewport.height, baseScale });
          if (scaledViewport.width > maxBaseWidth) maxBaseWidth = scaledViewport.width;
        }
        applyVisualScale();
        updateHud();
      })();
    });
    window.addEventListener('DOMContentLoaded', () => { renderInitial(); });

    function updateHud() {
      let hud = document.getElementById('hud');
      if (!hud) {
        hud = document.createElement('div');
        hud.id = 'hud';
        document.body.appendChild(hud);
      }
      hud.textContent = 'Zoom: ' + (scale*100).toFixed(0) + '%';
    }
  </script>
</head>
<body>
  <div class="toolbar">
    <div class="title">${file.name}</div>
    <div class="controls">
      <button onclick="zoomOut()">-</button>
      <button onclick="zoomIn()">+</button>
    </div>
  </div>
  <div id="outer"><div id="container"></div></div>
  <div id="hud"></div>
</body>
</html>`;
        setHtml(docHtml);
      } catch {
        setError('Unable to load PDF for inline viewing.');
      }
    }
    if (visible && file) {
      loadPdf();
    }
  }, [visible, file]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <View style={{ height: 48, backgroundColor: '#1f2937', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>PDF Viewer</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#3b82f6' }}>Close</Text>
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff' }}>{error}</Text>
          </View>
        ) : html ? (
          <WebView originWhitelist={["*"]} source={{ html }} allowFileAccess allowFileAccessFromFileURLs />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff' }}>Loading PDF…</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
