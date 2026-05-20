export function newId(prefix: string) {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `${prefix}_${random}`;
}

export function nowIso() {
  return new Date().toISOString();
}
