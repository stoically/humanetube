import "setimmediate";
import "rsuite/lib/styles/themes/dark/index.less";
import React from "react";
import ReactDOM from "react-dom";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Theater } from "./components/Theater";

function ErrorFallback({ error }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error?.message}</pre>
    </div>
  );
}

const App = (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Theater />
  </ErrorBoundary>
);

ReactDOM.render(App, document.getElementById("app"));
