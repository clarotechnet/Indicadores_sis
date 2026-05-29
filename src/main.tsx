import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Preload logo image
import logoUrl from "@/assets/logo.jpeg";
const link = document.createElement("link");
link.rel = "preload";
link.as = "image";
link.href = logoUrl;
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(<App />);
