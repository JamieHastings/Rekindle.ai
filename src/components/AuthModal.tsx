// src/components/AuthModal.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, supabaseUrl, supabaseAnonKey } from "../lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResetStep = "email" | "otp" | "password";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, setAuthListenerPaused } = useAuth();

  // Login / signup
  const [mode, setMode] = useState<"login" | "signup" | "forgot-password" | "email-confirmation">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot-password multi-step
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);

  const switchMode = (next: "login" | "signup" | "forgot-password" | "email-confirmation") => {
    setMode(next);
    setErrorMsg(null);
    setResetStep("email");
    setResetError("");
    setResetSuccess("");
  };

  // ── Login / signup ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setErrorMsg(error);
      else onClose();
    } else {
      const result = await signUp(email, password);
      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.needsEmailConfirmation) {
        setMode("email-confirmation");
      } else {
        onClose();
      }
    }
    setLoading(false);
  };

  // ── Reset step 1: send OTP ────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    setResetLoading(false);
    if (error) setResetError(error.message);
    else setResetStep("otp");
  };

  // ── Reset step 2: verify OTP ──────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");
    // Pause the auth listener BEFORE verifyOtp so the auto-login it triggers
    // is silently ignored — the app never shows the user as signed in.
    setAuthListenerPaused(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: otpCode,
      type: "recovery",
    });
    if (error) {
      setAuthListenerPaused(false);
      setResetLoading(false);
      setResetError("Invalid or expired code. Please try again.");
      return;
    }
    // Capture the token — session stays alive so the fetch can use it.
    // Do NOT call signOut here; that would invalidate the token.
    if (data.session?.access_token) {
      setRecoveryAccessToken(data.session.access_token);
    }
    setResetLoading(false);
    setResetStep("password");
    // Listener stays paused until after the password update + signOut.
  };

  // ── Reset step 3: update password ────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords don't match.");
      return;
    }
    setResetLoading(true);
    setResetError("");
    // Direct fetch with the captured token — no Supabase JS client involved,
    // so no USER_UPDATED / SIGNED_IN events fire in AuthContext.
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${recoveryAccessToken}`,
        "apikey": supabaseAnonKey,
      },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!response.ok) {
      setResetLoading(false);
      const body = await response.json().catch(() => ({}));
      setResetError(body?.message || "Failed to update password. Please try again.");
      return;
    }
    // Password updated — now sign out to clear the recovery session.
    // Resume the listener first so SIGNED_OUT is processed normally.
    setAuthListenerPaused(false);
    await supabase.auth.signOut();
    setRecoveryAccessToken(null);
    setResetLoading(false);
    setResetSuccess("Password updated! Please sign in with your new password.");
    setTimeout(() => {
      setResetStep("email");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetSuccess("");
      switchMode("login");
    }, 2000);
  };

  // ── Header icon / title per state ────────────────────────────────
  const headerIcon = () => {
    if (mode === "email-confirmation") return <Mail className="w-5 h-5 text-black" />;
    if (mode !== "forgot-password") return <Heart className="w-5 h-5 text-black" />;
    if (resetStep === "otp") return <ShieldCheck className="w-5 h-5 text-black" />;
    if (resetStep === "password") return <KeyRound className="w-5 h-5 text-black" />;
    return <Mail className="w-5 h-5 text-black" />;
  };

  const headerTitle = () => {
    if (mode === "login") return "Welcome Back";
    if (mode === "signup") return "Create Account";
    if (mode === "email-confirmation") return "Check Your Email";
    if (resetStep === "otp") return "Enter Code";
    if (resetStep === "password") return "Set New Password";
    return "Reset Password";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-panel border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#CC4F4E] rounded-lg">{headerIcon()}</div>
                <h2 className="text-xl font-bold text-text-dark">{headerTitle()}</h2>
              </div>
            </div>

            <div className="p-6">
              {/* ── Email confirmation pending ── */}
              {mode === "email-confirmation" && (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="p-4 bg-[#CC4F4E]/10 rounded-full">
                      <Mail className="w-10 h-10 text-[#CC4F4E]" />
                    </div>
                  </div>
                  <p className="text-text-dark font-medium">
                    We sent a confirmation link to
                  </p>
                  <p className="text-[#CC4F4E] font-semibold break-all">{email}</p>
                  <p className="text-text-light text-sm">
                    Click the link in that email to activate your account. You can close this window.
                  </p>
                  <p className="text-text-light text-xs">
                    Didn't receive it? Check your spam folder or{" "}
                    <button
                      className="text-[#CC4F4E] hover:opacity-80 transition-opacity underline"
                      onClick={() => switchMode("signup")}
                    >
                      try again
                    </button>.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition mt-2"
                  >
                    Got it
                  </button>
                </div>
              )}

              {/* ── Login / Signup ── */}
              {mode !== "forgot-password" && mode !== "email-confirmation" && (
                <>
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => switchMode("login")}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        mode === "login"
                          ? "bg-[#CC4F4E] text-black"
                          : "bg-background text-text-light hover:text-text-dark"
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => switchMode("signup")}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                        mode === "signup"
                          ? "bg-[#CC4F4E] text-black"
                          : "bg-background text-text-light hover:text-text-dark"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="space-y-4">
                    {errorMsg && (
                      <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                        {errorMsg}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">Email</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    {mode === "login" && (
                      <div className="text-right -mt-2">
                        <button
                          className="text-sm text-[#CC4F4E] hover:opacity-80 transition-opacity"
                          onClick={() => switchMode("forgot-password")}
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 mt-2"
                    >
                      {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Forgot password: Step 1 — email ── */}
              {mode === "forgot-password" && resetStep === "email" && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {resetSuccess && (
                    <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                      {resetSuccess}
                    </div>
                  )}
                  {resetError && (
                    <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                      {resetError}
                    </div>
                  )}
                  <p className="text-text-light text-sm">
                    Enter your email and we'll send you a 6-digit code.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {resetLoading ? "Sending..." : "Send Code"}
                  </button>
                  <p className="text-center text-sm">
                    <button
                      type="button"
                      className="text-[#CC4F4E] hover:opacity-80 transition-opacity"
                      onClick={() => switchMode("login")}
                    >
                      Back to login
                    </button>
                  </p>
                </form>
              )}

              {/* ── Forgot password: Step 2 — OTP ── */}
              {mode === "forgot-password" && resetStep === "otp" && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {resetError && (
                    <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                      {resetError}
                    </div>
                  )}
                  <p className="text-text-light text-sm">
                    Enter the 8-digit code sent to{" "}
                    <span className="text-[#CC4F4E]">{resetEmail}</span>.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="12345678"
                      maxLength={8}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors tracking-widest text-center text-lg"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading || otpCode.length < 8}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {resetLoading ? "Verifying..." : "Verify Code"}
                  </button>
                  <p className="text-center text-sm">
                    <button
                      type="button"
                      className="text-[#CC4F4E] hover:opacity-80 transition-opacity"
                      onClick={() => { setResetStep("email"); setResetError(""); setOtpCode(""); }}
                    >
                      Back
                    </button>
                  </p>
                </form>
              )}

              {/* ── Forgot password: Step 3 — new password ── */}
              {mode === "forgot-password" && resetStep === "password" && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {resetError && (
                    <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                      {resetError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {resetLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
