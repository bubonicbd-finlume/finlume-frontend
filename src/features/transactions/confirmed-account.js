export async function confirmImportAccount(name, type, { readSettings, saveSettings, setSettings }) {
  const before = await readSettings();
  if ((before.accounts || []).includes(name)) {
    setSettings(before);
    return name;
  }

  const next = {
    ...before,
    accounts: [...(before.accounts || []), name],
    accountTypes: { ...(before.accountTypes || {}), [name]: type },
  };
  if (await saveSettings(next)) {
    setSettings(next);
    return name;
  }

  let after;
  try {
    after = await readSettings();
  } catch {
    throw new Error("The account save could not be confirmed. Reconnect and try again; FinLume will check the cloud settings first.");
  }
  setSettings(after);
  if ((after.accounts || []).includes(name) && after.accountTypes?.[name] === type) return name;
  throw new Error("The account was not saved. Try again before importing the statement.");
}
