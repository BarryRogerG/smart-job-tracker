export function getStartOfWeek(dateInput) {
  const date = new Date(dateInput);
  const day = date.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const daysFromMonday = (day + 6) % 7;

  date.setDate(date.getDate() - daysFromMonday);
  date.setHours(0, 0, 0, 0);

  return date;
}
