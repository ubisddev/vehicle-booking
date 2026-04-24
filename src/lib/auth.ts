import { cookies } from "next/headers";
import { getServiceSupabase } from "./supabase";
import { User } from "@/types";

// Simple token = base64(userId)
export function createToken(userId: string): string {
  return Buffer.from(userId).toString("base64");
}

export function decodeToken(token: string): string | null {
  try {
    return Buffer.from(token, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return null;

  const userId = decodeToken(session.value);
  if (!userId) return null;

  const supabase = getServiceSupabase();
  const { data } = await supabase.from("users").select("*").eq("id", userId).single();
  return data as User | null;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
