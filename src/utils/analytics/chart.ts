export function niceMax(maxY: number) {
  if (maxY <= 10) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(maxY)));
  const unit = pow / 2;
  return Math.ceil(maxY / unit) * unit;
}
