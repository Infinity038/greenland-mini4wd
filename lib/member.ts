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

export function logout() {
  document.cookie = "gm4wd_registered=; path=/; max-age=0";
  localStorage.removeItem("gm4wd_member");
  window.location.href = "/register";
}