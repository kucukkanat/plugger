import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./theme";
import { Layout } from "./components/Layout";
import "./styles.css";
import "./hero.css";
import "./playground.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Layout />
    </ThemeProvider>
  </StrictMode>,
);
