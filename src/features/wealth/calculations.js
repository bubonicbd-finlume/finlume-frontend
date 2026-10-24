function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function investmentSummary(investments) {
  const list = investments || [];
  const totalCostBasis = list.reduce((sum, holding) => sum + number(holding.costBasis), 0);
  const totalCurrentValue = list.reduce((sum, holding) => sum + number(holding.currentValue), 0);
  const totalDividends = list.reduce((sum, holding) => sum + number(holding.dividends), 0);
  const gain = totalCurrentValue - totalCostBasis;
  const totalReturn = gain + totalDividends;
  const byClass = new Map();
  for (const holding of list) {
    const assetClass = holding.assetClass || "Other";
    byClass.set(assetClass, (byClass.get(assetClass) || 0) + number(holding.currentValue));
  }
  return {
    totalCostBasis,
    totalCurrentValue,
    totalDividends,
    gain,
    gainPct: totalCostBasis > 0 ? gain / totalCostBasis * 100 : 0,
    totalReturn,
    totalReturnPct: totalCostBasis > 0 ? totalReturn / totalCostBasis * 100 : 0,
    byClass
  };
}

export function maturityInfo(instrument, today, dueSoonDays = 30) {
  if (!instrument.maturityDate) return { label: "No maturity date", tone: "slate", days: null };
  const days = Math.round((parseDate(instrument.maturityDate) - parseDate(today)) / 864e5);
  if (instrument.status === "Withdrawn") return { label: "Withdrawn", tone: "slate", days };
  if (days < 0) return { label: `Matured ${Math.abs(days)}d ago`, tone: "rose", days };
  if (days === 0) return { label: "Matures today", tone: "orange", days };
  if (days <= dueSoonDays) return { label: `Matures in ${days}d`, tone: "orange", days };
  return { label: `Matures in ${days}d`, tone: "emerald", days };
}

export function savingsSummary(instruments, today, dueSoonDays = 30) {
  const active = (instruments || []).filter(instrument => instrument.status !== "Withdrawn");
  const totalPrincipal = active.reduce((sum, instrument) => sum + number(instrument.principal), 0);
  const byInstitution = new Map();
  for (const instrument of active) {
    const institution = instrument.institution || "Unspecified";
    byInstitution.set(institution, (byInstitution.get(institution) || 0) + number(instrument.principal));
  }
  const upcoming = active
    .filter(instrument => instrument.maturityDate)
    .map(instrument => ({ ...instrument, maturityInfo: maturityInfo(instrument, today, dueSoonDays) }))
    .filter(instrument => instrument.maturityInfo.days !== null && instrument.maturityInfo.days <= dueSoonDays)
    .sort((a, b) => a.maturityInfo.days - b.maturityInfo.days);
  return { totalPrincipal, count: active.length, byInstitution, upcoming };
}

export function accountSummary(accounts) {
  const assets = (accounts || []).filter(account => account.type === "asset").reduce((sum, account) => sum + number(account.balance), 0);
  const liabilities = (accounts || []).filter(account => account.type === "liability").reduce((sum, account) => sum + number(account.balance), 0);
  return { assets, liabilities, net: assets - liabilities };
}

export function combinedNetWorth(settings, today, dueSoonDays = 30) {
  const accounts = accountSummary(settings.netWorthAccounts);
  const investments = investmentSummary(settings.investments);
  const savings = savingsSummary(settings.savingsInstruments, today, dueSoonDays);
  const assets = accounts.assets + investments.totalCurrentValue + savings.totalPrincipal;
  return {
    assets,
    liabilities: accounts.liabilities,
    net: assets - accounts.liabilities,
    investmentsValue: investments.totalCurrentValue,
    savingsValue: savings.totalPrincipal,
    accountAssets: accounts.assets
  };
}

export function concentrationChecks(investments) {
  const active = (investments || []).filter(item => number(item.currentValue) > 0);
  const total = active.reduce((sum, item) => sum + number(item.currentValue), 0);
  if (!total) return { total: 0, checks: [] };
  const largest = [...active].sort((a, b) => number(b.currentValue) - number(a.currentValue))[0];
  const largestShare = number(largest.currentValue) / total * 100;
  const byClass = investmentSummary(active).byClass;
  const largestClass = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0];
  const largestClassShare = largestClass[1] / total * 100;
  const checks = [];
  if (largestShare >= 35) checks.push({ title: "Single-holding concentration", detail: `${largest.name} is ${largestShare.toFixed(0)}% of the portfolio.`, tone: largestShare >= 50 ? "rose" : "amber" });
  if (largestClassShare >= 60) checks.push({ title: "Asset-class concentration", detail: `${largestClass[0]} is ${largestClassShare.toFixed(0)}% of the portfolio.`, tone: largestClassShare >= 75 ? "rose" : "amber" });
  if (active.length < 3) checks.push({ title: "Limited diversification", detail: `The portfolio currently has ${active.length} holding${active.length === 1 ? "" : "s"}.`, tone: "sky" });
  return { total, activeCount: active.length, largestShare, largestClassShare, checks };
}

export function allocationDrift(investments, targetAllocation, assetClasses) {
  const summary = investmentSummary(investments);
  const total = summary.totalCurrentValue;
  return (assetClasses || [])
    .map(assetClass => {
      const value = summary.byClass.get(assetClass) || 0;
      const actual = total > 0 ? value / total * 100 : 0;
      const target = number(targetAllocation?.[assetClass]);
      return { cls: assetClass, value, actual, target, drift: actual - target };
    })
    .filter(row => row.actual > 0 || row.target > 0);
}
