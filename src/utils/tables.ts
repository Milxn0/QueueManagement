export function parseTableNo(name?: string | null) {
  if (!name) return null;
  const m = name.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function tableNameFromNo(no: number) {
  return `โต๊ะ ${no}`;
}
