const localhost = window.location.hostname.includes("localhost");
const apiUrl = localhost ? "http://localhost:8000" : "https://ledgerly-backend.example.com";

export const BACKEND_CONFIG = {
  apiUrl,
  enabled: window.localStorage.getItem("use_backend_parser") === "true" && !/\.example\.com/.test(apiUrl)
};

export function getBackendJwt() {
  try { window.localStorage.removeItem("backend_jwt"); } catch {}
  try { return window.sessionStorage.getItem("backend_jwt") || null; } catch { return null; }
}

export function setBackendJwt(token) {
  try { window.sessionStorage.setItem("backend_jwt", token); } catch {}
}

export async function callBackendApi(endpoint, options = {}) {
  const jwt = getBackendJwt();
  if (!jwt) throw new Error("Backend auth token not found. Configure JWT in Settings.");
  const { method = "GET", body, isFormData = false } = options;
  const fetchOpts = { method, headers: { Authorization: `Bearer ${jwt}` } };
  if (body) {
    if (isFormData) fetchOpts.body = body;
    else {
      fetchOpts.headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOpts.body = typeof body === "string" ? body : new URLSearchParams(body).toString();
    }
  }
  const response = await fetch(`${BACKEND_CONFIG.apiUrl}${endpoint}`, fetchOpts);
  if (!response.ok) {
    let errorMsg = `API error ${response.status}`;
    try { errorMsg = (await response.json()).detail || errorMsg; }
    catch { errorMsg = await response.text(); }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function parseStatementViaBackend(file, bank) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bank", bank);
  try {
    return await callBackendApi(file.name.endsWith(".csv") ? "/parse/csv" : "/parse/pdf", { method: "POST", body: formData, isFormData: true });
  } catch (error) {
    console.error("Backend parsing failed:", error);
    throw error;
  }
}

export async function categorizeViaBackend(narration, amount, date, isCredit) {
  const body = { narration, amount: amount || undefined, date: date || undefined, is_credit: isCredit || false };
  try { return await callBackendApi("/categorize/one", { method: "POST", body }); }
  catch (error) { console.error("Backend categorization failed:", error); throw error; }
}

export async function storeUserCorrectionViaBackend(transaction, correctedCategory, bank, userNotes) {
  const body = {
    transaction_id: transaction.transaction_id,
    corrected_category: correctedCategory,
    bank,
    narration: transaction.narration_raw,
    amount: transaction.amount,
    merchant_name: transaction.merchant_name || "",
    predicted_category: transaction.predicted_category,
    confidence: transaction.confidence,
    user_notes: userNotes || ""
  };
  try { return await callBackendApi("/correct", { method: "POST", body }); }
  catch (error) { console.error("Backend correction failed:", error); throw error; }
}
