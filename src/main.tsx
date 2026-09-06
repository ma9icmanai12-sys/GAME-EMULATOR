import React, { ErrorInfo, ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[NES Party] Caught uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#0a0a0c] text-zinc-200 flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-zinc-900 border-2 border-red-500/80 rounded-2xl p-6 shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center text-red-400 font-bold text-xl">
              !
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">NES TV Party</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Handheld controller recovery mode. An initialization error was caught.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-red-400 bg-black/60 p-3 rounded-lg w-full overflow-x-auto text-left max-h-32">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reload Gamepad
              </button>
              <button
                onClick={() => {
                  window.location.href = window.location.pathname;
                }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reset to Main
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);

