"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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
    <main className="flex min-h-screen items-center px-5 py-8 text-slate-900 md:px-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(20,48,43,0.10)] md:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between bg-[#173b37] p-7 text-white md:p-9">
          <Link href="/" className="flex w-fit items-center gap-3 font-semibold">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1">
              <Image src="/jiranibiz-logo.png" alt="" width={48} height={48} className="h-full w-full object-contain" />
            </span>
            <span className="text-lg tracking-[-0.04em]">JiraniBiz</span>
          </Link>
          <div className="my-9 md:my-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Your local advantage</p>
            <h2 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.035em] md:text-4xl">Good work deserves to be found.</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-emerald-50/80">Discover trusted services nearby or manage your business presence from one place.</p>
          </div>
          <Link href="/" className="text-sm font-medium text-emerald-100 hover:text-white">← Back to JiraniBiz</Link>
        </section>

        <section className="p-6 sm:p-9 md:p-10">
          <div>
            <p className="eyebrow">Welcome to JiraniBiz</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Sign in to continue." : "Join customers and local business owners."}</p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setMode("login")} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Login</button>
            <button type="button" onClick={() => setMode("register")} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Register</button>
          </div>

          {mode === "register" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole("customer")} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${role === "customer" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>Customer</button>
              <button type="button" onClick={() => setRole("business_owner")} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${role === "business_owner" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>Business owner</button>
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "register" && <input aria-label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />}
            <input aria-label="Email address" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
            {mode === "register" && <input aria-label="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />}
            <input aria-label="Password" required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none" />
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
