import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "motion/react";
import App from "./App";
import { AuthProvider } from "./auth";
import { ToastProvider } from "./toast";
import { ThemeProvider } from "./theme";
import "./index.css";

// MotionConfig reducedMotion="user": if the person's OS has "reduce motion" switched
// on, Framer Motion automatically turns off movement animations (fades still work).
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);
