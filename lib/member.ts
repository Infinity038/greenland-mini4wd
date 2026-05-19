import { supabase } from "@/lib/supabase";

export function isRegistered(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("gm4wd_registered=1");
}

export function getMemberData() {
  if (typeof localStorage === "undefined") return null;
  const data = localStorage.getItem("gm4wd_member");
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export function saveMemberData(data: any) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("gm4wd_member", JSON.stringify(data));
}

export async function getMemberDataFromSupabase(email: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("email", email)
    .single();
  if (error || !data) return null;
  saveMemberData(data);
  return data;
}

export async function getMemberOrdersFromSupabase(email: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("member_email", email)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export function logout() {
  document.cookie = "gm4wd_registered=; path=/; max-age=0";
  localStorage.removeItem("gm4wd_member");
  window.location.href = "/register";
}