import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonts are bundled so the script draws the same on every device, online or off.
import '@fontsource/noto-sans-syriac-eastern/syriac-500.css';
import '@fontsource/noto-sans-syriac-eastern/syriac-600.css';
import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import '@fontsource/gentium-book-plus/latin-400.css';
import '@fontsource/gentium-book-plus/latin-ext-400.css';
import '@fontsource/gentium-book-plus/latin-400-italic.css';
import '@fontsource/gentium-book-plus/latin-ext-400-italic.css';
import '@fontsource/gentium-book-plus/latin-700.css';
import '@fontsource/gentium-book-plus/latin-ext-700.css';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
