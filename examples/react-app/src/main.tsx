import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.bs";
import "./messaging.bs"; // SYN027 example: ensure the file is compiled

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
