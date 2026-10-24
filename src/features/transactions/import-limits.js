export const MAX_STATEMENT_FILE_BYTES = 10 * 1024 * 1024;

export function statementFileSizeError(file) {
  return file?.size > MAX_STATEMENT_FILE_BYTES
    ? "Statement files must be 10 MB or smaller. Choose a smaller export."
    : null;
}
