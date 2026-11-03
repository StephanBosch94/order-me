import type { MemberRole } from "@/lib/data/types";

export function memberRole(value: unknown): MemberRole {
  if (value === "owner" || value === "admin" || value === "staff") return value;
  return "staff";
}

export function isShopManager(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function memberRoleLabel(role: MemberRole) {
  if (role === "owner") return "Vlasnik";
  if (role === "admin") return "Admin";
  return "Korisnik";
}

export function compareMemberRoles(a: MemberRole, b: MemberRole) {
  return memberRoleRank(a) - memberRoleRank(b);
}

function memberRoleRank(role: MemberRole) {
  if (role === "owner") return 0;
  if (role === "admin") return 1;
  return 2;
}
