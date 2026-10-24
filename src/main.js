import "./styles.css";
import "./startup.css";
import { installCompatibilityGlobals } from "./platform/compatibility-globals.js";
import { readEnvironment, addSupabasePreconnect } from "./platform/environment.js";
import { createFinLumeClient } from "./platform/supabase-client.js";
import { installOptionalLibraryLoader } from "./platform/optional-libraries.js";
import { registerServiceWorker } from "./platform/service-worker.js";
import { beginStartup, finishStartup, showStartupError } from "./platform/startup-ui.js";
import { installFeatureServices } from "./platform/feature-services.js";

async function startFinLume() {
  beginStartup();

  try {
    const environment = readEnvironment(import.meta.env);
    addSupabasePreconnect(environment.supabaseUrl);
    installCompatibilityGlobals();
    installFeatureServices();

    window.__FINLUME_ENV__ = environment;
    window.__FINLUME_SUPABASE__ = createFinLumeClient(environment);
    installOptionalLibraryLoader();

    await import("./legacy-app.js");
    await import("./legal.js");
    await import("./accessibility.js");

    finishStartup();
    registerServiceWorker({ enabled: import.meta.env.PROD });
  } catch (error) {
    console.error("FinLume failed to start", error);
    showStartupError(error);
  }
}

startFinLume();
