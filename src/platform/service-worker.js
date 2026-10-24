export function registerServiceWorker({ enabled }) {
  if (!enabled || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      registration.update().catch(() => {});
    } catch (error) {
      console.warn("FinLume offline support could not start", error);
    }
  });
}
