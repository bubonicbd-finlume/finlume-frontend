function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])]));
  }
  return value;
}

const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

export async function confirmSettingsFieldsChange(beforeFields, nextFields, {
  readSettings, saveSettings, setSettings, allowedKeys, messages,
}) {
  const keys = Object.keys(nextFields);
  if (!keys.length || keys.some(key => !allowedKeys.includes(key)) || !same(keys.sort(), Object.keys(beforeFields).sort())) {
    throw new Error("Unknown settings change.");
  }
  const before = await readSettings();
  const pick = settings => Object.fromEntries(keys.map(key => [key, settings[key] ?? []]));
  if (same(pick(before), nextFields)) { setSettings(before); return; }
  if (!same(pick(before), beforeFields)) {
    setSettings(before);
    throw new Error(messages.changed);
  }
  const next = { ...before, ...nextFields };
  if (await saveSettings(next)) { setSettings(next); return; }
  let after;
  try { after = await readSettings(); }
  catch { throw new Error(messages.uncertain); }
  setSettings(after);
  if (same(pick(after), nextFields)) return;
  throw new Error(messages.failed);
}
