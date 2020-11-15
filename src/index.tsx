import "setimmediate";
import "rsuite/lib/styles/themes/dark/index.less";
import React from "react";
import ReactDOM from "react-dom";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Button } from "rsuite";
import { Theater } from "./components/Theater";

function ErrorFallback({ error }: FallbackProps) {
  const id = new URL(document.location.toString()).searchParams.get("watch");

  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error?.message}</pre>
      <div>
        {id && (
          <Button
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            appearance="ghost"
          >
            Broken? Open on YouTube
          </Button>
        )}
      </div>
    </div>
  );
}

const App = (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Theater />
  </ErrorBoundary>
);

ReactDOM.render(App, document.getElementById("app"));
