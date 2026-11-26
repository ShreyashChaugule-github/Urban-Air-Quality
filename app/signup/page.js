import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="auth-page wrap">
      <Link className="back-link" href="/">← Back to Clear Air</Link>
      <p className="tag">Your household account</p>
      <h1>Join Clear Air</h1>
      <p className="auth-lead">Create an account to keep your clean-air routines close.</p>
      <AuthForm mode="signup" />
    </main>
  );
}