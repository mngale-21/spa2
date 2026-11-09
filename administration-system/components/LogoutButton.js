"use client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={handleLogout} className="w-full text-left rounded-lg px-3 py-2 text-sand-100/70 hover:bg-white/8 hover:text-white transition text-sm border border-white/10">
      Toka (Logout)
    </button>
  );
}
