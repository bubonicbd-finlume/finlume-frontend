import { confirmSettingsFieldsChange } from "../../platform/confirmed-settings-fields.js";

export function confirmRecurringSuggestion(beforeFields, nextFields, options) {
  return confirmSettingsFieldsChange(beforeFields, nextFields, {
    ...options,
    allowedKeys: ["recurring", "subscriptions", "dismissedPatterns", "nameRules", "dismissedAnomalies", "notifiedSubscriptionFlags"],
    messages: {
      changed: "Recurring suggestions changed elsewhere. Review this page before trying again.",
      uncertain: "The suggestion result could not be confirmed. Reconnect and review this page before retrying.",
      failed: "The suggestion change was not confirmed. Review this page and retry.",
    },
  });
}