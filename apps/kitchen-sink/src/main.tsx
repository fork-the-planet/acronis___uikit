import React from 'react';
import ReactDOM from 'react-dom/client';

// Self-hosted Inter (OFL, via @fontsource) — the default family the design
// tokens reference (`font-family: Inter`). Only the weights used by the
// `.ui-typography-*` scale are loaded: 400/500/600/700.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

// The published library stylesheet: CSS reset (default element styles), the
// semantic `--ui-*` design tokens (from @acronis-platform/tokens-pd, with
// `light-dark()` driven by `color-scheme`), and the component utilities.
// Per-component token CSS (`--ui-button-*`, …) is loaded in `@/lib/tokens`.
import '@acronis-platform/ui-react/styles';

import App from '@/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
