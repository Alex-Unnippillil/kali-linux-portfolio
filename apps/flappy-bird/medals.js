export function getMedal(score) {
  if (score >= 30) return 'Gold';
  if (score >= 20) return 'Silver';
  if (score >= 10) return 'Bronze';
  return null;
}
