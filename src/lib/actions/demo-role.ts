"use server";

import { redirect } from "next/navigation";

import { storePath } from "@/lib/constants";
import { establishDemoRole } from "@/lib/demo-entry";
import type { DemoRole } from "@/lib/demo-shops";

export async function switchDemoRoleAction(slug: string, role: DemoRole) {
  if (role !== "prodavac" && role !== "kupac") return;
  if (!(await establishDemoRole(slug, role))) return;
  redirect(role === "prodavac" ? "/dashboard" : storePath(slug));
}
