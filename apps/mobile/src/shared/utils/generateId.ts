export function generateId(prefix = 'id'): string {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `${prefix}_${timePart}_${randomPart}`;
}
