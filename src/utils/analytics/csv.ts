export function csvEscape(val: unknown) {
  const s = val == null ? "" : String(val);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
