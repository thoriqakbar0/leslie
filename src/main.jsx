import React from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { App } from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {import.meta.env.DEV && <Agentation />}
  </React.StrictMode>,
);
