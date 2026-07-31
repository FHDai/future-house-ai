"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateFields = () => {
    if (!email.trim() || !password) {
      alert("Lütfen e-posta adresini ve şifreni gir.");
      return false;
    }

    if (password.length < 6) {
      alert("Şifre en az 6 karakter olmalı.");
      return false;
    }

    return true;
  };

  const handleSignIn = async () => {
    if (!validateFields()) return;

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  };

  const handleCreateAccount = async () => {
    if (!validateFields()) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "Hesabın oluşturuldu. Supabase tarafından gönderilen doğrulama e-postasını kontrol et."
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-gray-800 bg-neutral-950 p-8 shadow-2xl">
        <p className="mb-4 text-center text-xs uppercase tracking-[0.35em] text-gray-500">
          Future House AI
        </p>

        <h1 className="text-center text-4xl font-bold">Welcome Back</h1>

        <p className="mt-3 text-center text-gray-400">
          Sign in to continue to your workspace.
        </p>

        <form
          className="mt-10 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            handleSignIn();
          }}
        >
          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Email
            </label>

            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Password
            </label>

            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Sign In"}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-px flex-1 bg-gray-800" />
            <span className="text-xs uppercase tracking-widest text-gray-500">
              OR
            </span>
            <div className="h-px flex-1 bg-gray-800" />
          </div>

          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading}
            className="w-full rounded-xl border border-gray-700 px-6 py-3 font-medium transition hover:border-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Account
          </button>

          <p className="text-center text-xs text-gray-500">
            New users should create an account first.
          </p>

          <Link
            href="/"
            className="block text-center text-sm text-gray-500 hover:text-white"
          >
            ← Back to Home
          </Link>
        </form>
      </section>
    </main>
  );
}