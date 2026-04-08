"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function handleOAuth(provider: "apple" | "google") {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: provider === "apple" ? { response_mode: "form_post" } : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-1">ChatSpace</h1>
        <p className="text-white/50 text-sm">Welcome back</p>
      </div>

      {/* Card */}
      <div className="bg-[#1E1E30] border border-white/8 rounded-2xl p-6">
        {/* OAuth buttons */}
        <div className="space-y-2.5 mb-5">
          {/* Continue with Google */}
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#0D0D1A] border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] hover:border-white/20 disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or use email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/70 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[15px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="........"
              required
              className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[15px]"
            />
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
              boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>

      <p className="text-center text-white/40 text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
