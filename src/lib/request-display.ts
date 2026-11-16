export function eventSchedule(date: string | null, time: string | null, timezone: string) {
  if (!date && !time) return "Not provided";
  if (!date) return `Date not provided; ${time?.slice(0, 5)} (${timezone})`;
  if (!time) return `${date}; time not provided (${timezone})`;
  return `${date} at ${time.slice(0, 5)} (${timezone})`;
}
