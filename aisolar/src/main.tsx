import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Instrument design system — type/spacing/density/radius/motion scales.
// Must load after index.css so its geometry overrides the marketing defaults.
import "./styles/instrument.css";
import { installGlobalErrorReporting } from "./lib/errorReporting";

// Observability floor: capture uncaught errors + unhandled rejections → client_errors.
installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
