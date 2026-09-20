import type { Membership, Role, SessionContext } from "@/types";

const ROLE_RANK: Record<Role, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function hasMinRole(membership: Membership, minRole: Role): boolean {
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole];
}

export function assertOrgAccess(
  session: SessionContext,
  organizationId: string
): void {
  if (session.organization.id !== organizationId) {
    throw new AuthError("Access denied: organization mismatch", 403);
  }
}

export function assertRole(session: SessionContext, minRole: Role): void {
  if (!hasMinRole(session.membership, minRole)) {
    throw new AuthError(`Requires ${minRole} role or higher`, 403);
  }
}

/** Members can read; Admin+ can write documents/collections. */
export function canManageDocuments(session: SessionContext): boolean {
  return hasMinRole(session.membership, "ADMIN");
}

export function canManageCollections(session: SessionContext): boolean {
  return hasMinRole(session.membership, "MEMBER");
}

export function canAskQuestions(session: SessionContext): boolean {
  return hasMinRole(session.membership, "MEMBER");
}
