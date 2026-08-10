import React from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { App } from "./App.jsx";
import { Prototype } from "./Prototype.jsx";
import "./styles.css";

const RootApp = window.location.pathname === "/protoype" ? Prototype : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootApp />
    {import.meta.env.DEV && <Agentation />}
  </React.StrictMode>,
);
