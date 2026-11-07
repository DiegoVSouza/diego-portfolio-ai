/** Client-only entry for local spatial auditing; never included in the production build. */
import "colagem-ui/fonts.css";
import "colagem-ui/plate-fonts.css";
import "colagem-ui/tokens.css";
import "colagem-ui/style.css";
import "../styles/site.css";
import { createRoot } from "react-dom/client";
import { App } from "../App";
import { preload } from "../site/pages";
import { parsePath } from "../site/router";

await preload(parsePath(window.location.pathname));
createRoot(document.getElementById("root")!).render(<App url={window.location.pathname} />);
