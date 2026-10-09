import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="flex min-h-screen items-center px-5 py-12 text-slate-900">
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <p className="eyebrow">Account security</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {token ? "Choose a new password" : "Reset your password"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {token
            ? "Reset links expire after 30 minutes and can only be used once."
            : "Enter your account email and we will send a one-time reset link if an account exists."}
        </p>
        <PasswordResetForm token={token ?? ""} />
        <Link href="/auth" className="mt-6 inline-block text-sm font-medium text-emerald-800 underline">
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
