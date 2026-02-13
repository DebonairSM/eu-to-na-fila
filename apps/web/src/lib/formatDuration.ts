/**
 * Format a duration in minutes as a short human-readable string.
 * Examples: 160 -> "2h 40m", 60 -> "1h", 45 -> "45m", 0 -> "0m"
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
