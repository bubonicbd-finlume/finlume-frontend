export async function confirmDocumentMutation({ readDocuments, saveDocuments, setDocuments, makeChange, isConfirmed }) {
  const before = await readDocuments();
  const { next, changed, meta } = await makeChange(before);
  if (!changed) {
    setDocuments(before);
    return { changed: false, meta, before };
  }

  if (await saveDocuments(next)) {
    setDocuments(next);
    return { changed: true, meta, before };
  }

  let after;
  try {
    after = await readDocuments();
  } catch {
    throw new Error("The document save could not be confirmed. Reconnect and review Documents before trying again.");
  }
  setDocuments(after);
  if (isConfirmed(after, next)) return { changed: true, meta, before };
  throw new Error("The document change was not confirmed. Review Documents and try again.");
}
