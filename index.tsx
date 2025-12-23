import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ReportView from './components/ReportView';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const isReportPage = window.location.pathname === '/report' || window.location.pathname.startsWith('/r/');

root.render(
  <React.StrictMode>
    {isReportPage ? <ReportView /> : <App />}
  </React.StrictMode>
);