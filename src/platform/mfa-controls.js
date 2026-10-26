import React, { useEffect, useState } from "react";

async function ensure(result) { if (result.error) throw result.error; return result.data; }

export function usableTotpFactors(factors) {
  return (Array.isArray(factors) ? factors : []).filter(factor => factor?.id && factor.status === "verified");
}

export function MfaGate({ auth, session, children }) {
  const [state, setState] = useState({ status: "loading", factors: [] });
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: "loading", factors: [] });
    (async () => {
      try {
        const level = await ensure(await auth.mfa.getAuthenticatorAssuranceLevel());
        if (!active) return;
        if (level.currentLevel === "aal1" && level.nextLevel === "aal2") {
          const factors = await ensure(await auth.mfa.listFactors());
          if (active) {
            const available = usableTotpFactors(factors.totp);
            setFactorId(available[0]?.id || "");
            setState({ status: "challenge", factors: available });
          }
        } else setState({ status: "ready", factors: [] });
      } catch (error) { if (active) setState({ status: "error", message: error?.message || "Could not check your security settings." }); }
    })();
    return () => { active = false; };
  }, [auth, session?.user?.id, session?.access_token, retry]);
  async function verify(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      const factor = state.factors.find(item => item.id === factorId);
      if (!factor) throw new Error("No authenticator factor is available. Contact support to recover access.");
      const challenge = await ensure(await auth.mfa.challenge({ factorId: factor.id }));
      await ensure(await auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code }));
      setCode("");
      setRetry(value => value + 1);
    } catch (error) { setState(previous => ({ ...previous, message: error?.message || "Code could not be verified." })); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true);
    try {
      const result = await auth.signOut();
      if (result.error) throw result.error;
    } catch (error) {
      setState(previous => ({ ...previous, message: error?.message || "Sign out could not finish. Try again." }));
      setBusy(false);
    }
  }
  if (state.status === "ready") return children;
  return React.createElement("main", { className: "min-h-screen flex items-center justify-center p-4" }, React.createElement("section", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" },
    React.createElement("h1", { className: "text-lg font-semibold text-slate-800" }, "Verify your sign-in"),
    state.status === "loading" ? React.createElement("p", { role: "status", className: "text-sm text-slate-600 mt-2" }, "Checking your security settings…") :
    state.status === "error" ? React.createElement(React.Fragment, null, React.createElement("p", { role: "alert", className: "text-sm text-rose-700 mt-2" }, state.message), React.createElement("button", { onClick: () => setRetry(value => value + 1), className: "mt-3 min-h-11 px-4 rounded-lg bg-indigo-600 text-white" }, "Try again")) :
    React.createElement(React.Fragment, null,
      state.status === "challenge" && state.factors.length === 0 ? React.createElement("p", { role: "alert", className: "text-sm text-rose-700 mt-3" }, "No verified authenticator is available for this account. Sign out and contact your administrator for account recovery.", state.message ? ` ${state.message}` : "") :
        state.status === "challenge" && React.createElement("form", { onSubmit: verify, className: "mt-3 space-y-3" }, React.createElement("p", { className: "text-sm text-slate-600" }, "Enter the six-digit code from your authenticator app."), state.factors.length > 1 && React.createElement("select", { value: factorId, onChange: event => { setFactorId(event.target.value); setCode(""); }, "aria-label": "Authenticator", className: "h-11 w-full rounded-lg border border-slate-300 px-3" }, state.factors.map(factor => React.createElement("option", { key: factor.id, value: factor.id }, factor.friendly_name || "Authenticator"))), React.createElement("input", { type: "text", inputMode: "numeric", pattern: "[0-9]{6}", maxLength: 6, autoComplete: "one-time-code", value: code, onChange: event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6)), className: "h-11 w-full rounded-lg border border-slate-300 px-3", "aria-label": "Authenticator code" }), state.message && React.createElement("p", { role: "alert", className: "text-sm text-rose-700" }, state.message), React.createElement("button", { type: "submit", disabled: busy || !factorId || code.length !== 6, className: "min-h-11 px-4 rounded-lg bg-indigo-600 text-white disabled:opacity-50" }, busy ? "Verifying…" : "Verify")),
      React.createElement("button", { type: "button", disabled: busy, onClick: signOut, className: "mt-3 text-sm text-slate-600 underline disabled:opacity-50" }, busy ? "Signing out…" : "Sign out"))));
}

export function MfaSettingsCard({ auth, Card, Button }) {
  const [factors, setFactors] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; auth.mfa.listFactors().then(result => { if (active) { if (result.error) setError(result.error.message); else setFactors(result.data?.totp || []); } }); return () => { active = false; }; }, [auth, revision]);
  async function start() {
    setBusy(true); setError(""); setMessage("");
    try { setEnrollment(await ensure(await auth.mfa.enroll({ factorType: "totp", friendlyName: "Finlume authenticator" }))); }
    catch (cause) { setError(cause?.message || "Authenticator setup could not start."); }
    finally { setBusy(false); }
  }
  async function finish(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const challenge = await ensure(await auth.mfa.challenge({ factorId: enrollment.id })); await ensure(await auth.mfa.verify({ factorId: enrollment.id, challengeId: challenge.id, code })); setEnrollment(null); setCode(""); setRevision(value => value + 1); setMessage("Authenticator enabled. Other sessions may need to sign in again."); }
    catch (cause) { setError(cause?.message || "The code could not be verified."); }
    finally { setBusy(false); }
  }
  async function remove(factor) {
    if (!window.confirm(`Remove authenticator ${factor.friendly_name || factor.id}?`)) return;
    setBusy(true); setError("");
    try { await ensure(await auth.mfa.unenroll({ factorId: factor.id })); setRevision(value => value + 1); setMessage("Authenticator removed."); }
    catch (cause) { setError(cause?.message || "Authenticator could not be removed."); }
    finally { setBusy(false); }
  }
  async function revokeOthers() {
    setBusy(true); setError("");
    try { await ensure(await auth.signOut({ scope: "others" })); setMessage("Other sessions were revoked. Their access tokens may remain valid until expiry."); }
    catch (cause) { setError(cause?.message || "Other sessions could not be revoked."); }
    finally { setBusy(false); }
  }
  return React.createElement(Card, { className: "p-5 mt-4" }, React.createElement("h3", { className: "text-[14px] font-semibold text-slate-800" }, "Authenticator & sessions"),
    React.createElement("p", { className: "text-[12px] text-slate-500 mt-1 mb-3" }, "Use an authenticator app for a second sign-in step. Keep access to your authenticator before enabling this."),
    factors.length ? React.createElement("ul", { className: "space-y-2 mb-3" }, factors.map(factor => React.createElement("li", { key: factor.id, className: "flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-[12px]" }, React.createElement("span", null, factor.friendly_name || "Authenticator", ` · ${factor.status || "verified"}`), React.createElement(Button, { variant: "outline", onClick: () => remove(factor), disabled: busy }, "Remove")))) : React.createElement("p", { className: "text-[12px] text-slate-500 mb-3" }, "No authenticator is currently enrolled."),
    enrollment ? React.createElement("form", { onSubmit: finish, className: "space-y-2 mb-3" }, React.createElement("p", { className: "text-[12px] text-slate-600" }, "Scan this code with your authenticator app, then enter its six-digit code."), enrollment.totp?.qr_code && React.createElement("img", { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.totp.qr_code)}`, alt: "Authenticator setup QR code", className: "w-40 h-40" }), React.createElement("code", { className: "block break-all text-[11px]" }, enrollment.totp?.secret), React.createElement("input", { value: code, onChange: event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6)), pattern: "[0-9]{6}", maxLength: 6, inputMode: "numeric", autoComplete: "one-time-code", "aria-label": "Setup authenticator code", className: "h-11 w-full rounded-lg border border-slate-300 px-3" }), React.createElement(Button, { type: "submit", disabled: busy || code.length !== 6 }, "Enable authenticator"), React.createElement(Button, { variant: "ghost", onClick: () => setEnrollment(null), disabled: busy }, "Cancel")) : React.createElement(Button, { onClick: start, disabled: busy }, "Add authenticator"),
    React.createElement("div", { className: "border-t border-slate-200 mt-4 pt-4" }, React.createElement(Button, { variant: "outline", onClick: revokeOthers, disabled: busy }, "Sign out other sessions")),
    error && React.createElement("p", { role: "alert", className: "text-[12px] text-rose-700 mt-3" }, error), message && React.createElement("p", { role: "status", className: "text-[12px] text-emerald-700 mt-3" }, message));
}
