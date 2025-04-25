import React from "react";
import { createRoot } from "react-dom/client";
import ModernApp from "./ModernApp.jsx";
import "./index.css";

const root = document.getElementById("root");
createRoot(root).render(<ModernApp />);