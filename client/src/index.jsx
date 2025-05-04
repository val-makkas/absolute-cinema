import { Buffer } from 'buffer'
window.Buffer = Buffer

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { HashRouter } from "react-router-dom";

const root = document.getElementById("root");
createRoot(root).render(
  <HashRouter>
    <App />
  </HashRouter>
);