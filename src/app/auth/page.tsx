"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"customer" | "business_owner">("customer");
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify(mode === "login"
          ? { email: form.email, password: form.password }
          : { ...form, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Authentication failed");
      const destination = data.user?.role === "business_owner" || data.user?.role === "admin"
        ? "/dashboard"
        : "/discover";
      router.push(destination);
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
        <section className="order-2 flex flex-col justify-between bg-[#173b37] p-7 text-white md:order-none md:p-9">
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

        <section className="order-1 p-6 sm:p-9 md:order-none md:p-10">
          <div>
            <p className="eyebrow">Welcome to JiraniBiz</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Sign in to continue." : "Join customers and local business owners."}</p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button type="button" aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Sign in</button>
            <button type="button" aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); }} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Create account</button>
          </div>

          {mode === "register" && (
            <div className="mt-4" role="group" aria-label="Choose account type">
              <p className="mb-2 text-sm font-medium text-slate-700">I’m here to</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={role === "customer"} onClick={() => { setRole("customer"); setError(""); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${role === "customer" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>Find services</button>
                <button type="button" aria-pressed={role === "business_owner"} onClick={() => { setRole("business_owner"); setError(""); }} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${role === "business_owner" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>Grow my business</button>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "register" && <label className="block text-sm font-medium text-slate-700">Full name<input autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none" /></label>}
            <label className="block text-sm font-medium text-slate-700">Email address<input autoComplete="email" autoCapitalize="none" spellCheck={false} required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none" /></label>
            {mode === "register" && <label className="block text-sm font-medium text-slate-700">Phone number <span className="font-normal text-slate-500">(optional)</span><input autoComplete="tel" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none" /></label>}
            <label className="block text-sm font-medium text-slate-700">Password<div className="relative mt-1.5"><input autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : undefined} type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm font-normal outline-none" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 my-auto rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">{showPassword ? "Hide" : "Show"}</button></div></label>
            {mode === "login" && <Link href="/reset-password" className="block text-right text-sm font-medium text-emerald-800 underline underline-offset-4">Forgot password?</Link>}
            {error && <p role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
            <button disabled={loading} aria-busy={loading} className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
            <p className="text-center text-xs leading-5 text-slate-500">Your account information is stored securely and never shown publicly.</p>
          </form>
        </section>
      </div>
    </main>
  );
}
