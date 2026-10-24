export async function confirmVaultConfigChange({ readSettings, saveSettings, setSettings, config }) {
  const before = await readSettings();
  const next = { ...before, vaultConfig: config };
  if (await saveSettings(next)) {
    setSettings(next);
    return next;
  }

  let after;
  try {
    after = await readSettings();
  } catch {
    throw new Error("The vault setting could not be confirmed. Reconnect and reload Settings before trying again.");
  }
  setSettings(after);
  if (JSON.stringify(after.vaultConfig ?? null) === JSON.stringify(config)) return after;
  throw new Error("The vault setting was not saved. Review Settings and try again.");
}
