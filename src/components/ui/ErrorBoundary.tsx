import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg, #080809)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, padding: 32, color: 'var(--text, #F0F0F2)',
      }}>
        <div style={{
          maxWidth: 540, width: '100%', padding: '24px', borderRadius: 12,
          background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.3)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#FF453A', marginBottom: 10 }}>
            Something went wrong
          </div>
          <pre style={{
            fontSize: 12, fontFamily: 'monospace', color: '#F0F0F2',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            maxHeight: 300, overflowY: 'auto',
          }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '8px 20px', borderRadius: 8,
            background: '#7C6AF7', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
