export function cardWidth(settings, id) {
  return settings?.dashboardCardWidths?.[id] === 2 ? 2 : 1;
}

export function updateCardWidth(settings, id, width) {
  const allowed = new Set(["netWorth", "income", "spending", "savingsRate", "debt", "recurring"]);
  if (!allowed.has(id)) return settings?.dashboardCardWidths || {};
  return { ...(settings?.dashboardCardWidths || {}), [id]: width === 2 ? 2 : 1 };
}

