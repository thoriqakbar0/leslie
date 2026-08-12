import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DevAgentation } from "#dev-agentation";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Leslie root element is missing");

createRoot(rootElement).render(
  <StrictMode>
    <App />
    {import.meta.env.DEV ? <DevAgentation /> : null}
  </StrictMode>,
);
