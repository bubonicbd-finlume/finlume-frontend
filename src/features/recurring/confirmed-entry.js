import { confirmSettingsFieldsChange } from "../../platform/confirmed-settings-fields.js";

export function confirmRecurringEntryChange(field, beforeEntries, nextEntries, options) {
  if (field !== "recurring" && field !== "subscriptions") throw new Error("Unknown recurring entry type.");
  return confirmSettingsFieldsChange({ [field]: beforeEntries }, { [field]: nextEntries }, {
    ...options,
    allowedKeys: ["recurring", "subscriptions"],
    messages: {
      changed: "Recurring entries changed elsewhere. Close this form and review them before trying again.",
      uncertain: "The recurring entry could not be confirmed. Reconnect and review this page before retrying.",
      failed: "The recurring entry was not confirmed. Review this page and retry.",
    },
  });
}