import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import App from "./App";
import "./index.css";

const AGENTATION_ENDPOINT = "http://127.0.0.1:4747";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Leslie root element is missing");

const agentationEnabled = import.meta.env.DEV || import.meta.env.VITE_AGENTATION_ENABLED === "true";

createRoot(rootElement).render(
  <StrictMode>
    <App />
    {agentationEnabled ? <Agentation endpoint={AGENTATION_ENDPOINT} /> : null}
  </StrictMode>,
);
