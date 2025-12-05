// src/components/AuthModal.tsx

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const action = mode === "login" ? signIn : signUp;

    const { error } = await action(email, password);

    if (error) setErrorMsg(error);
    else onClose();

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          {mode === "login" ? "Log In" : "Create Account"}
        </h2>

        {errorMsg && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm">
            {errorMsg}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
        </button>

        <p className="text-center text-sm mt-4">
          {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
          <button
            className="text-blue-600 underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </p>

        <button
          className="mt-4 w-full py-2 text-gray-600 underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
