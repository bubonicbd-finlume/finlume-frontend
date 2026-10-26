function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? date.getTime() / 86400000 : null;
}

// ACT/365 convention. One cash-flow sign change is required so that a unique
// bisection root can be reported; ambiguous patterns return null.
export function xirr(cashFlows) {
  const flows = (cashFlows || []).map(flow => ({ date: dayNumber(flow.date), amount: Number(flow.amount) }));
  if (flows.length < 2 || flows.some(flow => flow.date == null || !Number.isFinite(flow.amount) || flow.amount === 0)) return null;
  flows.sort((a, b) => a.date - b.date);
  if (flows[0].date === flows.at(-1).date) return null;
  const changes = flows.slice(1).reduce((count, flow, index) => count + (Math.sign(flow.amount) !== Math.sign(flows[index].amount) ? 1 : 0), 0);
  if (changes !== 1) return null;
  const start = flows[0].date;
  const npv = rate => flows.reduce((sum, flow) => sum + flow.amount / Math.pow(1 + rate, (flow.date - start) / 365), 0);
  let low = -0.999999;
  let high = 1000;
  let lowValue = npv(low);
  const highValue = npv(high);
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return null;
  for (let index = 0; index < 200; index++) {
    const midpoint = (low + high) / 2;
    const value = npv(midpoint);
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) < 1e-8) return midpoint;
    if (Math.sign(value) === Math.sign(lowValue)) { low = midpoint; lowValue = value; }
    else high = midpoint;
  }
  return (low + high) / 2;
}

export function singlePurchaseAnnualizedReturn(holding, valuationDate) {
  if (!holding?.purchaseDate || holding.isSip === true || holding.isSip === "true" || Number(holding.dividends) > 0) return null;
  const cost = Number(holding.costBasis);
  const current = Number(holding.currentValue);
  if (!(cost > 0) || !(current > 0)) return null;
  return xirr([{ date: holding.purchaseDate, amount: -cost }, { date: valuationDate, amount: current }]);
}

export function holdingCashFlows(holding, valuationDate) {
  const flows = Array.isArray(holding?.cashFlows) ? holding.cashFlows.filter(flow => /^\d{4}-\d{2}-\d{2}$/.test(flow?.date || "") && Number.isFinite(Number(flow.amount))) : [];
  if (flows.length) return [...flows.map(flow => ({ date: flow.date, amount: Number(flow.amount) })), ...(Number(holding.currentValue) > 0 ? [{ date: valuationDate, amount: Number(holding.currentValue) }] : [])];
  if (holding?.purchaseDate && Number(holding.costBasis) > 0) return [{ date: holding.purchaseDate, amount: -(Number(holding.costBasis) + Math.max(0, Number(holding.fees) || 0)) }, { date: valuationDate, amount: Number(holding.currentValue) + Math.max(0, Number(holding.withdrawals) || 0) + Math.max(0, Number(holding.dividends) || 0) }];
  return [];
}

export function holdingPerformance(holding, valuationDate) {
  const cost = Math.max(0, Number(holding?.costBasis) || 0), fees = Math.max(0, Number(holding?.fees) || 0), value = Math.max(0, Number(holding?.currentValue) || 0), withdrawals = Math.max(0, Number(holding?.withdrawals) || 0), dividends = Math.max(0, Number(holding?.dividends) || 0);
  const unrealized = value - cost;
  const realized = withdrawals + dividends - Math.max(0, Number(holding?.withdrawnCostBasis) || 0) - fees;
  const flows = holdingCashFlows(holding, valuationDate);
  return { cost, fees, value, withdrawals, dividends, unrealized, realized, absoluteReturn: value + withdrawals + dividends - cost - fees, xirr: flows.length >= 2 ? xirr(flows) : null, flows };
}
