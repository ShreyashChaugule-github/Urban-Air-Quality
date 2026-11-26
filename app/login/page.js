import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="auth-page wrap">
      <Link className="back-link" href="/">← Back to Clear Air</Link>
      <p className="tag">Your household account</p>
      <h1>Welcome back</h1>
      <p className="auth-lead">Sign in to your Clear Air account.</p>
      <AuthForm mode="login" />
    </main>
  );
}