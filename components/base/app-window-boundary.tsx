import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';

type AppWindowBoundaryProps = {
    appId: string;
    appTitle: string;
    onRetry: () => void;
    children: ReactNode;
};

type AppWindowBoundaryState = {
    hasError: boolean;
};

const log = createLogger();

class AppWindowBoundary extends Component<AppWindowBoundaryProps, AppWindowBoundaryState> {
    constructor(props: AppWindowBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): AppWindowBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
        log.error('AppWindowBoundary caught an error', {
            error,
            errorInfo,
            appId: this.props.appId,
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false }, () => {
            this.props.onRetry();
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    role="alert"
                    className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ub-cool-grey/90 p-6 text-center text-white backdrop-blur"
                >
                    <div>
                        <p className="text-sm uppercase tracking-wide text-ubt-grey">{this.props.appTitle}</p>
                        <h2 className="mt-2 text-xl font-semibold">This app crashed</h2>
                        <p className="mt-1 text-sm text-ubt-grey">
                            The app ran into an unexpected problem. Restart to try again.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        className="rounded-md bg-ubt-blue px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-ubt-blue/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ub-cool-grey"
                    >
                        Restart app
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default AppWindowBoundary;
