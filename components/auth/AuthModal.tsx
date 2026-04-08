"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type AuthView = "login" | "signup" | "forgot" | "reset_sent";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialView?: AuthView;
}

export default function AuthModal({ open, onClose, onSuccess, initialView = "login" }: Props) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (view === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        onSuccess();
      }
    } else if (view === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSuccess("Check your email to confirm your account");
        setLoading(false);
      }
    } else if (view === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setView("reset_sent");
        setLoading(false);
      }
    }
  }

  async function handleOAuthLogin(provider: "apple" | "google") {
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

  function switchView(v: AuthView) {
    setView(v);
    setError(null);
    setSuccess(null);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
          className="relative z-10 w-full max-w-md bg-[#13131F] border-t border-white/10 rounded-t-3xl sm:rounded-2xl sm:border sm:mx-4 overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-20 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">ChatSpace</h2>
              <p className="text-white/50 text-sm mt-1">
                {view === "login" && "Welcome back"}
                {view === "signup" && "Join the conversation"}
                {view === "forgot" && "Reset your password"}
                {view === "reset_sent" && "Check your inbox"}
              </p>
            </div>

            {/* Reset sent success */}
            {view === "reset_sent" && (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" fill="none" stroke="#22C55E" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" />
                    <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Password reset email sent</p>
                <p className="text-white/40 text-sm mt-1.5">Check your inbox and follow the link to reset your password.</p>
                <button
                  onClick={() => switchView("login")}
                  className="mt-4 text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}

            {view !== "reset_sent" && (
              <>
                {/* OAuth buttons */}
                {(view === "login" || view === "signup") && (
                  <div className="space-y-2.5 mb-4">
                    {/* Sign in with Apple */}
                    <button
                      onClick={() => handleOAuthLogin("apple")}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      {view === "login" ? "Sign in with Apple" : "Continue with Apple"}
                    </button>

                    {/* Continue with Google */}
                    <button
                      onClick={() => handleOAuthLogin("google")}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 bg-[#1E1E30] border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98] hover:border-white/20 disabled:opacity-60"
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
                )}

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 text-green-400 text-sm">
                      {success}
                    </div>
                  )}

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[15px]"
                  />

                  {(view === "login" || view === "signup") && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      minLength={6}
                      className="w-full bg-[#0D0D1A] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[15px]"
                    />
                  )}

                  {/* Forgot password link */}
                  {view === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchView("forgot")}
                        className="text-purple-400 text-xs font-medium hover:text-purple-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
                      boxShadow: "0 0 20px rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    {loading ? "..." : view === "login" ? "Sign In" : view === "signup" ? "Create Account" : "Send Reset Link"}
                  </button>
                </form>

                {/* Toggle login/signup */}
                <p className="text-center text-white/40 text-sm mt-4">
                  {view === "login" ? (
                    <>
                      {"Don't have an account? "}
                      <button onClick={() => switchView("signup")} className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                        Sign up
                      </button>
                    </>
                  ) : view === "signup" ? (
                    <>
                      {"Already have an account? "}
                      <button onClick={() => switchView("login")} className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                        Log in
                      </button>
                    </>
                  ) : (
                    <button onClick={() => switchView("login")} className="text-purple-400 font-medium hover:text-purple-300 transition-colors">
                      Back to login
                    </button>
                  )}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
