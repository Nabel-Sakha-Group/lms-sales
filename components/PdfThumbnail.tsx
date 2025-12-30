import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface PdfThumbnailProps {
  sourceUrl: string;
}

export default function PdfThumbnail({ sourceUrl }: PdfThumbnailProps) {
  const html = useMemo(() => {
    const escaped = sourceUrl.replace(/"/g, '\"');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body { margin:0; padding:0; background:#fef3c7; }
    #wrapper { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
    canvas { display:block; max-width:100%; height:auto; box-shadow:0 1px 4px rgba(0,0,0,0.2); border-radius:8px; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    window['pdfjsLib'] = window['pdfjsLib'] || {};
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const SOURCE_URL = "${escaped}";
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url: SOURCE_URL, withCredentials: false });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = window.innerWidth - 16;
        const scale = containerWidth > 0 ? Math.min(containerWidth / viewport.width, 2) : 1;
        const scaledViewport = page.getViewport({ scale });
        const canvas = document.getElementById('thumb');
        const ctx = canvas.getContext('2d');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = scaledViewport.width + 'px';
        canvas.style.height = scaledViewport.height + 'px';
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      } catch (e) {
        document.body.style.background = '#fee2e2';
      }
    });
  </script>
</head>
<body>
  <div id="wrapper">
    <canvas id="thumb"></canvas>
  </div>
</body>
</html>`;
  }, [sourceUrl]);

  return (
    <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', borderRadius: 12 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        startInLoadingState
        renderLoading={() => (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
            <ActivityIndicator color="#f97316" />
          </View>
        )}
      />
    </View>
  );
}
