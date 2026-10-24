export function reconcileImport(result, sourceRows, submittedRows) {
  const source = Math.max(0, Number(sourceRows) || 0);
  const submitted = Math.max(0, Number(submittedRows) || 0);
  const inserted = Math.max(0, Number(result?.inserted) || 0);
  const duplicates = Math.max(0, Number(result?.duplicates) || 0);
  const skippedInvalid = Math.max(0, source - submitted);
  const unconfirmed = Math.max(0, submitted - inserted - duplicates);
  return {
    source, submitted, inserted, duplicates, skippedInvalid, unconfirmed,
    reconciled: source >= submitted && inserted + duplicates === submitted
  };
}
