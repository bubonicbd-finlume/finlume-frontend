import { confirmSettingsFieldsChange } from "../../platform/confirmed-settings-fields.js";

export function confirmBudgetsChange(beforeBudgets, nextBudgets, options) {
  return confirmSettingsFieldsChange({ budgets: beforeBudgets }, { budgets: nextBudgets }, {
    ...options,
    allowedKeys: ["budgets"],
    messages: {
      changed: "Budgets changed elsewhere. Close this form and review the current budgets before trying again.",
      uncertain: "The budget change could not be confirmed. Reconnect and review Budgets before retrying.",
      failed: "The budget change was not confirmed. Review Budgets and retry.",
    },
  });
}