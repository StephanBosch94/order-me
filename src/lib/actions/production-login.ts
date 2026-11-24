"use server";

import { redirect } from "next/navigation";

export type ProductionLoginChoice = {
  email: string;
  password: string;
  name: string;
  roleLabel: string;
  shop: string;
};

export async function listProductionLoginChoices(): Promise<ProductionLoginChoice[]> {
  return [];
}

export async function signInProductionAccount() {
  redirect("/login");
}
