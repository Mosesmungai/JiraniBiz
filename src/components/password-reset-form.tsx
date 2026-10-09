"use client";

import { FormEvent, useState } from "react";

export function PasswordResetForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        token ? "/api/auth/password-reset/confirm" : "/api/auth/password-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(token ? { token, password } : { email }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to process the request.");
      setMessage(result.message);
      setEmail("");
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to process the request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {token ? (
        <input
          aria-label="New password"
          autoComplete="new-password"
          minLength={8}
          maxLength={256}
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password (8+ characters)"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
        />
      ) : (
        <input
          aria-label="Email address"
          autoComplete="email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
        />
      )}
      {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Please wait..." : token ? "Reset password" : "Send reset link"}
      </button>
    </form>
  );
}
