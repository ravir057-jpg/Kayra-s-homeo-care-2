import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Signal to index.html safety net that React mounted successfully
// @ts-ignore
if (typeof window !== 'undefined' && typeof window.__KAYRA_MOUNTED__ === 'function') {
  // @ts-ignore
  window.__KAYRA_MOUNTED__();
}
