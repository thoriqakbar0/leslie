import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Leslie root element is missing");

createRoot(rootElement).render(
  <StrictMode>
    <App />
    {import.meta.env.DEV ? <Agentation /> : null}
  </StrictMode>,
);
