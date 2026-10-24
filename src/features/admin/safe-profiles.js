export function safeProfiles(value) {
  return Array.isArray(value) ? value.filter(profile => profile !== null && typeof profile === "object" && !Array.isArray(profile)) : [];
}

export function validSignupDates(profiles, now = new Date()) {
  const latest = now.getTime();
  return safeProfiles(profiles).map(profile => new Date(profile.created_at))
    .filter(date => Number.isFinite(date.getTime()) && date.getTime() <= latest &&
      date.getTime() >= latest - 10 * 366 * 86400000)
    .sort((a, b) => a - b);
}
