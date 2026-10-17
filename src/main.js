import * as React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import * as ReactIs from "react-is";
import * as Recharts from "recharts";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

window.React = React;
window.ReactDOM = { createRoot, createPortal };
window.PropTypes = PropTypes;
window.ReactIs = ReactIs;
window.Recharts = Recharts;
window.supabase = { createClient };
window.__FINLUME_ENV__ = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "",
};

if (!window.__FINLUME_ENV__.supabaseUrl || !window.__FINLUME_ENV__.supabaseKey) {
  document.getElementById("root").innerHTML = '<div style="max-width:680px;margin:64px auto;padding:24px;border-radius:16px;background:#fff;color:#1e293b;font:15px/1.6 system-ui;box-shadow:0 20px 50px rgba(30,20,80,.2)"><h1 style="font-size:20px;margin:0 0 8px">FinLume needs its Supabase settings</h1><p style="margin:0">Copy <code>.env.example</code> to <code>.env.local</code>, add the project URL and publishable key, then restart the development server.</p></div>';
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
}

const loaded = new Map();
window.__lib = function loadOptionalLibrary(name) {
  if (loaded.has(name)) return loaded.get(name);
  const promise = (async () => {
    if (name === "papaparse") {
      const module = await import("papaparse");
      window.Papa = module.default || module;
      return window.Papa;
    }
    if (name === "xlsx") {
      window.XLSX = await import("xlsx");
      return window.XLSX;
    }
    if (name === "jspdf") {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      if (typeof autoTableModule.applyPlugin === "function") autoTableModule.applyPlugin(jsPDF);
      window.jspdf = { jsPDF };
      return window.jspdf;
    }
    if (name === "pdfjs") {
      const [pdfjs, worker] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
      ]);
      window.pdfjsLib = pdfjs;
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
      return window.pdfjsLib;
    }
    throw new Error("Unknown optional library: " + name);
  })().catch((error) => {
    loaded.delete(name);
    throw error;
  });
  loaded.set(name, promise);
  return promise;
};

import("./legacy-app.js")
  .then(() => import("./legal.js"))
  .then(() => import("./accessibility.js"))
  .catch((error) => {
    console.error("FinLume failed to start", error);
  });

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
