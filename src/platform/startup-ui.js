const root = () => document.getElementById("root");

function startupCard(title, message, { retry = false, loading = false } = {}) {
  const shell = document.createElement("main");
  shell.className = "finlume-startup";
  shell.setAttribute("aria-live", "polite");

  const card = document.createElement("section");
  card.className = "finlume-startup__card";

  const heading = document.createElement("h1");
  heading.className = "finlume-startup__brand";
  heading.textContent = title;

  const detail = document.createElement("p");
  detail.className = "finlume-startup__message";
  detail.textContent = message;

  card.append(heading, detail);

  if (loading) {
    const spinner = document.createElement("div");
    spinner.className = "finlume-startup__spinner";
    spinner.setAttribute("aria-hidden", "true");
    card.appendChild(spinner);
  }

  if (retry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "finlume-startup__action";
    button.textContent = "Try again";
    button.addEventListener("click", () => window.location.reload());
    card.appendChild(button);
  }

  shell.appendChild(card);
  return shell;
}

export function beginStartup() {
  performance.mark?.("finlume-startup-begin");
  const mount = root();
  if (mount && !mount.hasChildNodes()) {
    mount.replaceChildren(startupCard("FinLume", "Preparing your financial workspace…", { loading: true }));
  }
}

export function finishStartup() {
  performance.mark?.("finlume-startup-ready");
  try {
    performance.measure?.("finlume-startup", "finlume-startup-begin", "finlume-startup-ready");
  } catch {}
}

export function showStartupError(error) {
  const missingConfig = error?.code === "MISSING_SUPABASE_CONFIG";
  const invalidUrl = error?.code === "INVALID_SUPABASE_URL";
  const message = missingConfig
    ? "Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Netlify, then redeploy."
    : invalidUrl
      ? "The Supabase project URL is invalid. Check VITE_SUPABASE_URL in Netlify and redeploy."
      : "The app could not finish loading. Check your connection, then try again.";

  root()?.replaceChildren(startupCard("FinLume could not start", message, { retry: true }));
}
