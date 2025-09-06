export function genQueueCode() {
  const base = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.floor(Math.random() * 36 ** 2)
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `Q${base}${rand}`;
}
