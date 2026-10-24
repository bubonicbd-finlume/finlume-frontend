export const INBOX_GROUPS = [
  { id: "now", title: "Needs attention now", description: "Overdue items and warnings", limit: 3 },
  { id: "upcoming", title: "Coming up", description: "Saved schedules within 30 days", limit: 2 },
  { id: "cleanup", title: "Data to review", description: "Records that need checking", limit: 2 }
];

export function inboxGroupId(item) {
  if (item.kind === "scheduled") return "upcoming";
  if (item.key === "categorization" || item.kind === "unconfirmed") return "cleanup";
  return "now";
}

export function groupInboxItems(items) {
  return INBOX_GROUPS.map(group => ({ ...group, items: items.filter(item => inboxGroupId(item) === group.id) }));
}
