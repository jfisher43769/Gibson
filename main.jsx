import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// createRoot, NOT hydrateRoot — deliberate, despite every route being prerendered
// (scripts/prerender.mjs). React discards the server HTML here and renders fresh, and that
// is what we want: the app renders time-dependent things — seasonStatus(), the Predictor's
// Date.now() lock check, the build stamp — so markup generated at BUILD time will not match
// what the client would produce at VIEW time, and hydrateRoot would report mismatches.
// The prerendered HTML still does its job: crawlers and first paint see real content.
// Do not "upgrade" this to hydrateRoot without first making the render time-invariant.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
