import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Instrument design system — type/spacing/density/radius/motion scales.
// Must load after index.css so its geometry overrides the marketing defaults.
import "./styles/instrument.css";

createRoot(document.getElementById("root")!).render(<App />);
