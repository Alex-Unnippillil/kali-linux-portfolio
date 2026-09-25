import React from 'react';

interface State {
  hasError: boolean;
}

class TetrisErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Tetris crashed', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-100">
          <div className="rounded border border-rose-500 bg-slate-900 p-4 text-center">
            <p className="font-semibold text-rose-300">Tetris encountered an error.</p>
            <p className="text-sm text-slate-300">Close and reopen the app window to recover.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default TetrisErrorBoundary;
