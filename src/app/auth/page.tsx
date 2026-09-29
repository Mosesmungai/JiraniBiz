"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"customer" | "business_owner">("customer");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Authentication failed");
      router.push(role === "business_owner" ? "/dashboard" : "/discover");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">JiraniBiz</p>
          <h1 className="mt-3 text-3xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Sign in to continue." : "Join customers and local business owners."}</p>
        </div>

        <div className="mt-7 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
          <button onClick={() => setMode("login")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm" : "text-slate-500"}`}>Login</button>
          <button onClick={() => setMode("register")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-white shadow-sm" : "text-slate-500"}`}>Register</button>
        </div>

        {mode === "register" && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setRole("customer")} className={`rounded-xl border px-3 py-2 text-sm ${role === "customer" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}>Customer</button>
            <button onClick={() => setRole("business_owner")} className={`rounded-xl border px-3 py-2 text-sm ${role === "business_owner" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}>Business owner</button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" />}
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" />
          {mode === "register" && <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" />}
          <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+ characters)" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-500" />
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
      </div>
    </main>
  );
}
