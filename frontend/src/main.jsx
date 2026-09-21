import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import './material-web.js';
import './index.css';
import App from './App.jsx';
import { initAnalytics } from './analytics.js';

initAnalytics();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("React Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#fff', backgroundColor: '#000', height: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ff5555' }}>アプリケーションエラー</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{padding: '10px', marginTop: '10px'}}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
} else {
  console.error("Root element not found");
}
