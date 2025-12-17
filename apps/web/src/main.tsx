import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

// #region agent log
const appStartTime = performance.now();
fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:13',message:'App initialization start',data:{readyState:document.readyState,performanceNow:appStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});

document.fonts.ready.then(() => {
  const materialSymbolsLoaded = document.fonts.check('24px Material Symbols Outlined');
  const initTime = performance.now() - appStartTime;
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:16',message:'Material Symbols font ready check',data:{materialSymbolsLoaded,fontStatus:document.fonts.status,initTimeMs:initTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
});
// Track when Material Symbols font actually loads
const fontLoadStartTime = performance.now();
document.fonts.addEventListener('loadingdone', (event) => {
  const fontLoadTime = performance.now() - fontLoadStartTime;
  const fonts = Array.from(event.fontfaces).map(f => f.family);
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:23',message:'Fonts loaded',data:{fonts,fontLoadTimeMs:fontLoadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
}, { once: true });

// Track performance entries for resource loading
if ('PerformanceObserver' in window) {
  try {
    const perfObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('MaterialSymbols') || entry.name.includes('font') || entry.name.includes('icon') || entry.name.includes('favicon')) {
          const resourceEntry = entry as PerformanceResourceTiming;
          fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:31',message:'Performance entry',data:{name:entry.name,type:entry.entryType,duration:entry.duration,startTime:entry.startTime,transferSize:resourceEntry.transferSize || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        }
      });
    });
    perfObserver.observe({ entryTypes: ['resource', 'font'] });
  } catch (e) {
    // PerformanceObserver might not support all entry types
  }
}
// #endregion

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter 
      basename="/mineiro"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

