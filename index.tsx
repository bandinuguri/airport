import './styles/amo.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import Router from './Router';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
