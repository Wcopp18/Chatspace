"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="w-full text-center">
        <div className="text-4xl mb-4">💌</div>
        <h2 className="text-xl font-bold text-white mb-2">Check your inbox</h2>
        <p className="text-white/50 text-sm mb-6">
          We sent a confirmation link to <span className="text-white/80">{email}</span>
        </p>
        <Link href="/login" className="text-[#FF3CAC] text-sm font-medium hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-1">ChatSpace</h1>
        <p className="text-white/50 text-sm">Create your account</p>
      </div>

      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-6">
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/70 text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF3CAC]/50 focus:ring-1 focus:ring-[#FF3CAC]/30 transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF3CAC]/50 focus:ring-1 focus:ring-[#FF3CAC]/30 transition-all text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#FF3CAC]/50 focus:ring-1 focus:ring-[#FF3CAC]/30 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-bg text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 glow-pink-sm mt-2"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>

      <p className="text-center text-white/40 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#FF3CAC] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
