const loadedLibraries = new Map();

async function loadLibrary(name) {
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

  throw new Error(`Unknown optional library: ${name}`);
}

export function installOptionalLibraryLoader() {
  window.__lib = function loadOptionalLibrary(name) {
    if (loadedLibraries.has(name)) return loadedLibraries.get(name);

    const promise = loadLibrary(name).catch((error) => {
      loadedLibraries.delete(name);
      throw error;
    });

    loadedLibraries.set(name, promise);
    return promise;
  };
}
