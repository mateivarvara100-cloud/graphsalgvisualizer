import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App from './App';

// Automatically normalize 127.0.0.1 to localhost so Google OAuth origin strictly matches
if (window.location.hostname === '127.0.0.1') {
  window.location.replace(window.location.href.replace('127.0.0.1', 'localhost'));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);