import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initAnalytics } from "./lib/analytics";
import { initOpenAIPixel } from "./lib/openai-pixel";

initAnalytics();
initOpenAIPixel();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
