"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "@firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

const authMessages = {
  "auth/email-already-in-use": "An account already exists for this email.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/weak-password": "Choose a stronger password with at least 8 characters.",
  "auth/operation-not-allowed": "Email and password sign-in is disabled. Enable it in Firebase Authentication settings.",
  "auth/unauthorized-domain": "Add this site to Firebase Authentication’s authorized domains.",
  "auth/invalid-api-key": "The Firebase API key is invalid. Check your environment settings.",
  "auth/too-many-requests": "Too many attempts. Wait a little, then try again.",
  "auth/network-request-failed": "Network issue. Check your connection and retry."
};

export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, router, user]);

  async function submit(event) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase is not configured.");
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/");
    } catch (error) {
      setMessage(authMessages[error.code] || "We couldn’t complete that request. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!configured || !email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      setMessage(authMessages[error.code] || "We couldn’t send a reset email. Check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-form-wrap">
      {!configured && <p className="disclaimer" role="status">Firebase isn’t configured yet. Add the public Firebase settings from <code>.env.example</code> to <code>.env.local</code>, then restart the app.</p>}
      <form className="auth-form" onSubmit={submit}>
        {isSignup && <div className="field"><label htmlFor="name">Name <span>(optional)</span></label><input id="name" autoComplete="name" maxLength={80} value={name} onChange={event => setName(event.target.value)} /></div>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></div>
        {!isSignup && <button className="text-button" type="button" onClick={resetPassword} disabled={busy || !configured}>Reset password</button>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button primary full" type="submit" disabled={busy || !configured}>{busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button>
      </form>
      <p className="auth-switch">{isSignup ? "Already have an account?" : "New to Clear Air?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p>
    </div>
  );
}