import * as liabilities from "../features/liabilities/calculations.js";
import * as goals from "../features/goals/calculations.js";
import * as tax from "../features/tax/calculations.js";
import * as dashboard from "../features/dashboard/calculations.js";
import * as budgets from "../features/budgets/calculations.js";
import * as recurring from "../features/recurring/calculations.js";
import * as financialReview from "../features/financial-review/calculations.js";
import * as wealth from "../features/wealth/calculations.js";
import * as transactions from "../features/transactions/calculations.js";

export function installFeatureServices() {
  window.__FINLUME_FEATURES__ = Object.freeze({ liabilities, goals, tax, dashboard, budgets, recurring, financialReview, wealth, transactions });
}
