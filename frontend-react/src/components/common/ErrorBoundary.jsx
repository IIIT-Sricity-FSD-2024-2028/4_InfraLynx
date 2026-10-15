import React from 'react';

/**
 * Universal ErrorBoundary component to prevent white screen crashes
 * and provide clean recovery controls.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[TIMS ErrorBoundary caught an exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '2.5rem',
          margin: '2rem auto',
          maxWidth: '680px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#fca5a5' }}>
            Portal View Encountered an Error
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'A transient UI rendering issue occurred while processing data.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
            >
              Recover View
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
