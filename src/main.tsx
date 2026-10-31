import "colagem-ui/fonts.css";
import "colagem-ui/plate-fonts.css";
import "colagem-ui/tokens.css";
import "colagem-ui/style.css";
import "./styles/site.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LangProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </StrictMode>,
);
