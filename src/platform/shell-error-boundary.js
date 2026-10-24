import React from "react";

export class ShellErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("FinLume could not render:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return React.createElement("main", {
      className: "min-h-screen flex items-center justify-center px-4",
    }, React.createElement("div", {
      role: "alert",
      className: "w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl",
    }, React.createElement("h1", {
      className: "mb-2 text-lg font-semibold text-slate-800",
    }, "FinLume could not open"), React.createElement("p", {
      className: "mb-4 text-sm text-slate-600",
    }, "Something went wrong while showing the app. Reload to try again."), React.createElement("button", {
      type: "button",
      className: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
      onClick: () => window.location.reload(),
    }, "Reload FinLume")));
  }
}
