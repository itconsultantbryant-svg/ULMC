import { describe, expect, it } from "vitest";
import { can, canEditoriallyApprove, canFinallyApprove } from "@/server/permissions";

describe("permissions", () => {
  it("denies access when no actor", () => {
    expect(can(null, "article.create")).toBe(false);
  });

  it("allows staff to create articles", () => {
    expect(can({ id: "1", roles: ["staff"] }, "article.create")).toBe(true);
  });

  it("prevents author from editorial approval", () => {
    expect(canEditoriallyApprove({ actorId: "a", authorIds: ["a"] })).toBe(false);
    expect(canEditoriallyApprove({ actorId: "b", authorIds: ["a"] })).toBe(true);
  });

  it("prevents author/editor from final approval", () => {
    expect(canFinallyApprove({ actorId: "a", authorIds: ["a"] })).toBe(false);
    expect(canFinallyApprove({ actorId: "e", authorIds: ["a"], editorId: "e" })).toBe(false);
    expect(canFinallyApprove({ actorId: "c", authorIds: ["a"], editorId: "e" })).toBe(true);
  });
});
