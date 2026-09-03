// Ensure window.fetch has both a getter and setter to prevent "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  try {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return currentFetch;
      },
      set(fn) {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true
    });
  } catch {
    // Ignore if already configured or unconfigurable
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
