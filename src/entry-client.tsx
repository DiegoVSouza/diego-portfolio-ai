import "colagem-ui/fonts.css";
import "colagem-ui/plate-fonts.css";
import "colagem-ui/tokens.css";
import "colagem-ui/style.css";
import "./styles/site.css";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { preload } from "./site/pages";
import { parsePath } from "./site/router";

await preload(parsePath(window.location.pathname));

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <App url={window.location.pathname} />
  </StrictMode>,
);
