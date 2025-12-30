import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

interface OnlinePdfViewerModalProps {
  visible: boolean;
  sourceUrl: string | null;
  title?: string;
  onClose: () => void;
}

export default function OnlinePdfViewerModal({ visible, sourceUrl, title, onClose }: OnlinePdfViewerModalProps) {
  // Use PDF.js in a minimal HTML to render remote PDFs cleanly without Google Docs
  const html = useMemo(() => {
    if (!sourceUrl) return null;
    const escaped = sourceUrl.replace(/"/g, '\"');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin:0; height:100%; background:#0f172a; }
    #toolbar { height:44px; background:#1f2937; color:#fff; display:flex; align-items:center; padding:0 12px; font-family:sans-serif; position:sticky; top:0; z-index:10; }
    #viewerContainer { position:absolute; top:44px; bottom:0; left:0; right:0; overflow:auto; }
    .page { margin: 16px auto; background:#111; box-shadow:0 1px 6px rgba(0,0,0,0.3); width:100%; display:flex; justify-content:center; }
    .page canvas { display:block; max-width:100%; height:auto; }
    button { margin-right:8px; background:#334155; color:#fff; border:none; padding:6px 10px; border-radius:6px; }
    #pageInfo { color:#9ca3af; margin-left:8px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    // Configure worker
    window['pdfjsLib'] = window['pdfjsLib'] || {};
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const SOURCE_URL = "${escaped}";
    let pdfDoc = null, scale = 1.0;
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const renderAllPages = async () => {
      const container = document.getElementById('viewerContainer');
      container.innerHTML = '';
      for (let num = 1; num <= pdfDoc.numPages; num++) {
        const page = await pdfDoc.getPage(num);
        const unscaled = page.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth - 24; // padding allowance
        const fitScale = containerWidth > 0 ? (containerWidth / unscaled.width) : 1;
        const viewport = page.getViewport({ scale: fitScale * scale });
        const wrapper = document.createElement('div');
        wrapper.className = 'page';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Use devicePixelRatio to render crisply when zooming
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        await page.render({ canvasContext: ctx, viewport, transform }).promise;
      }
      document.getElementById('pageInfo').textContent = 'Pages: ' + pdfDoc.numPages;
    };
    const onZoomIn = () => { scale = Math.min(scale + 0.15, 4); renderAllPages(); };
    const onZoomOut = () => { scale = Math.max(scale - 0.15, 0.4); renderAllPages(); };
    // Pinch zoom for mobile
    let pinchStartDist = null;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStartDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const delta = (dist - pinchStartDist) / 200;
        const newScale = Math.max(0.4, Math.min(4, scale + delta));
        if (Math.abs(newScale - scale) > 0.05) { scale = newScale; renderAllPages(); }
        pinchStartDist = dist;
      }
    }, { passive: true });
    document.addEventListener('touchend', () => { pinchStartDist = null; }, { passive: true });
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: SOURCE_URL, withCredentials: false });
        pdfDoc = await loadingTask.promise;
        renderAllPages();
        document.getElementById('zin').onclick = onZoomIn;
        document.getElementById('zout').onclick = onZoomOut;
        window.addEventListener('resize', () => { renderAllPages(); });
      } catch (e) {
        document.getElementById('error').textContent = 'Failed to load PDF.';
      }
    });
  </script>
  <title>PDF Viewer</title>
  </head>
<body>
  <div id="toolbar">
    <button id="zin">Zoom +</button>
    <button id="zout">Zoom -</button>
    <span id="pageInfo"></span>
  </div>
  <div id="viewerContainer"></div>
  <div id="error" style="color:#ef4444; text-align:center; margin-top:8px;"></div>
</body>
</html>`;
  }, [sourceUrl]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <View style={{ height: 48, backgroundColor: '#1f2937', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontSize: 16 }} numberOfLines={1}>{title || 'PDF'}</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#3b82f6' }}>Close</Text>
          </TouchableOpacity>
        </View>
        {html ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            startInLoadingState
            allowsInlineMediaPlayback
            allowsFullscreenVideo
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff' }}>No source URL</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
