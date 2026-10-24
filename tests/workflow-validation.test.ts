import { describe, expect, it } from "vitest";
import { editorialChecklistSchema } from "@/server/workflow/validation";

describe("workflow validation", () => {
  it("requires all checklist items for editorial approval", () => {
    const result = editorialChecklistSchema.parse({
      sources_verified: true,
      image_rights: true,
      captions_credit: true,
      accessibility: true,
      quality: true,
    });
    expect(result.sources_verified).toBe(true);
  });
});
