import { describe, expect, it } from "vitest";
import {
  assertOrgAccess,
  assertRole,
  AuthError,
  canManageDocuments,
  hasMinRole,
} from "@/lib/auth/rbac";
import type { Membership, SessionContext } from "@/types";

function session(role: Membership["role"], orgId = "org-1"): SessionContext {
  return {
    demoMode: true,
    user: {
      id: "u1",
      email: "a@example.com",
      name: "A",
      createdAt: "",
      updatedAt: "",
    },
    organization: {
      id: orgId,
      name: "Org",
      slug: "org",
      createdAt: "",
      updatedAt: "",
    },
    membership: {
      id: "m1",
      organizationId: orgId,
      userId: "u1",
      role,
      createdAt: "",
    },
  };
}

describe("authorization", () => {
  it("ranks roles correctly", () => {
    expect(hasMinRole(session("MEMBER").membership, "MEMBER")).toBe(true);
    expect(hasMinRole(session("MEMBER").membership, "ADMIN")).toBe(false);
    expect(hasMinRole(session("ADMIN").membership, "ADMIN")).toBe(true);
    expect(hasMinRole(session("OWNER").membership, "ADMIN")).toBe(true);
  });

  it("blocks cross-org access", () => {
    expect(() => assertOrgAccess(session("OWNER", "org-1"), "org-2")).toThrow(AuthError);
  });

  it("enforces role gates", () => {
    expect(() => assertRole(session("MEMBER"), "ADMIN")).toThrow(AuthError);
    expect(() => assertRole(session("ADMIN"), "ADMIN")).not.toThrow();
    expect(canManageDocuments(session("MEMBER"))).toBe(false);
    expect(canManageDocuments(session("ADMIN"))).toBe(true);
  });
});
