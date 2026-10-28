import "server-only";

import { getDataMode } from "@/lib/config";
import { getDemoStore } from "@/lib/data/demo-store";
import type { CommerceRepository } from "@/lib/data/repository";
import { supabaseRepository } from "@/lib/data/supabase-store";

export function getCommerce(): CommerceRepository {
  return getDataMode() === "supabase" ? supabaseRepository : getDemoStore();
}

export function getDemoIdentity() {
  if (getDataMode() !== "demo") {
    throw new Error("Demo identitet je dostupan samo kada Supabase nije podešen.");
  }
  return getDemoStore();
}
