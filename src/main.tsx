import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  if (!import.meta.env.PROD) {
    // Em desenvolvimento, remove service workers antigos para garantir hot-reload sem cache obsoleto.
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      })
      .catch(() => {});
  } else {
    // Em produção, força atualização imediata no mobile sem cache HTTP do script SW
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          void registration.update().catch(() => {});

          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              void registration.update().catch(() => {});
            }
          });

          window.setInterval(() => {
            void registration.update().catch(() => {});
          }, 15 * 60 * 1000);
        })
        .catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
