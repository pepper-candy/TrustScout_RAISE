/** Postgres undefined_column */
const PG_UNDEFINED_COLUMN = "42703";
/** PostgREST schema cache miss for a column */
const PGRST_UNKNOWN_COLUMN = "PGRST204";

export function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  if (error.code === PG_UNDEFINED_COLUMN || error.code === PGRST_UNKNOWN_COLUMN) return true;
  return error.message?.includes("does not exist") ?? false;
}
