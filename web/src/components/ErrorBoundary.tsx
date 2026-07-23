import { Component, ReactNode } from 'react'
import { AlertTriangleIcon } from './icons'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--canvas)' }}>
        <div className="card p-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-5" style={{ color: 'var(--brand-ink)' }}><AlertTriangleIcon className="w-14 h-14" /></div>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink-strong)' }}>Something went wrong</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            className="btn-primary px-6"
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }
}
