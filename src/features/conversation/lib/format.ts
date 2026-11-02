export type SessionGroup = "Today" | "Yesterday" | "Previous 7 days" | "Earlier";

const GROUP_ORDER: SessionGroup[] = [
  "Today",
  "Yesterday",
  "Previous 7 days",
  "Earlier",
];

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function titleFromMessage(content: string, max = 60): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (!collapsed) return "New conversation";
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}…` : collapsed;
}

export function relativeTime(value: Date | string, now: Date = new Date()): string {
  const date = asDate(value);
  const diffMs = now.getTime() - date.getTime();

  if (!Number.isFinite(diffMs)) return "";
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000 && startOfDay(date).getTime() === startOfDay(now).getTime()) {
    return `${Math.floor(diffMs / 3_600_000)}h ago`;
  }

  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000
  );

  if (days <= 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(value: Date | string): string {
  return asDate(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function groupSessionDate(
  value: Date | string,
  now: Date = new Date()
): SessionGroup {
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(asDate(value)).getTime()) / 86_400_000
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  return "Earlier";
}

export function groupSessions<T extends { updatedAt: Date | string }>(
  items: T[],
  now: Date = new Date()
): Array<{ group: SessionGroup; items: T[] }> {
  const buckets = new Map<SessionGroup, T[]>();

  for (const item of items) {
    const group = groupSessionDate(item.updatedAt, now);
    const bucket = buckets.get(group);
    if (bucket) bucket.push(item);
    else buckets.set(group, [item]);
  }

  return GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({
    group,
    items: buckets.get(group) ?? [],
  }));
}
