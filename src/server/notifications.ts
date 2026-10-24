import { notification } from "@/server/db/schema";
import type { Executor } from "@/server/db/executor";

type NotifyInput = {
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
};

export async function notifyUsers(executor: Executor, input: NotifyInput): Promise<void> {
  const unique = [...new Set(input.userIds.filter(Boolean))];
  if (unique.length === 0) return;
  await executor
    .insert(notification)
    .values(
      unique.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${userId}` : null,
      })),
    )
    .onConflictDoNothing();
}
