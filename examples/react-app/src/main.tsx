import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.bs";
import "./scheduling.bs"; // SYN025/026 example: ensure the file is compiled

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
