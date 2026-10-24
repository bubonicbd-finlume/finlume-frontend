import { confirmSettingsFieldsChange } from "../../platform/confirmed-settings-fields.js";

export function confirmDateRulesChange(beforeRules, nextRules, options) {
  return confirmSettingsFieldsChange({ datesToRemember: beforeRules }, { datesToRemember: nextRules }, {
    ...options,
    allowedKeys: ["datesToRemember"],
    messages: {
      changed: "Dates to Remember changed elsewhere. Close this dialog and review the current dates before trying again.",
      uncertain: "The date change could not be confirmed. Reconnect and review Dates to Remember before retrying.",
      failed: "The date change was not confirmed. Review Dates to Remember and retry.",
    },
  });
}