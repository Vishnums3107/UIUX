import { Component } from 'react';
import { captureRuntimeError } from '../services/errorTracking';

class AppErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        captureRuntimeError(error, {
            source: 'react.error_boundary',
            severity: 'high',
            component: 'AppErrorBoundary',
            stack: errorInfo?.componentStack
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
                    <div className="max-w-lg w-full rounded-2xl border border-red-500/30 bg-slate-900/80 p-8 shadow-2xl shadow-red-900/20">
                        <h1 className="text-2xl font-semibold text-red-200">Unexpected Error</h1>
                        <p className="mt-3 text-slate-300">
                            The app encountered an unexpected runtime error. The incident has been logged.
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="mt-6 w-full rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold py-3 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppErrorBoundary;