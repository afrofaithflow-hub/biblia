import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Em desenvolvimento, desativa service workers antigos para garantir hot-reload sem cache obsoleto.
// Em produção, o vite-plugin-pwa gerencia o registro automático via Workbox com autoUpdate.
if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
