export function estimatedTax(taxableIncome, slabs, options = {}) {
  let remaining = Math.max(0, Number(taxableIncome) || 0);
  let previousThreshold = 0;
  let tax = 0;
  const breakdown = [];
  for (const slab of slabs || []) {
    const bandTop = slab.upTo === null ? Infinity : Number(slab.upTo);
    const bandSize = Math.max(0, bandTop - previousThreshold);
    const taxedInBand = Math.min(remaining, bandSize);
    if (taxedInBand > 0) {
      const bandTax = taxedInBand * ((Number(slab.rate) || 0) / 100);
      tax += bandTax;
      breakdown.push({ from: previousThreshold, to: slab.upTo, rate: slab.rate, amount: taxedInBand, tax: bandTax });
    }
    remaining -= taxedInBand;
    previousThreshold = bandTop;
    if (remaining <= 0) break;
  }
  const slabTax = tax;
  const rebateLimit = Number(options.rebateLimit) || 0;
  const rebateMax = Number(options.rebateMax) || 0;
  const cessPct = Number(options.cessPct) || 0;
  let rebate = 0;
  let relief = 0;
  const income = Math.max(0, Number(taxableIncome) || 0);
  if (rebateLimit > 0) {
    if (income <= rebateLimit) rebate = Math.min(slabTax, rebateMax);
    else relief = Math.max(0, slabTax - (income - rebateLimit));
  }
  const afterRelief = Math.max(0, slabTax - rebate - relief);
  const cess = afterRelief * cessPct / 100;
  return { tax: afterRelief + cess, slabTax, rebate, relief, cess, cessPct, breakdown };
}
