import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/staff-controls";
import { databaseConfigured } from "@/lib/config";
export default function Login() {
  return <main className="center-page"><div className="panel"><Brand /><span className="eyebrow" style={{ marginTop: 35 }}>THE RESTAURANT WORKSPACE</span><h1>Welcome back.</h1><p>Sign in to view catering requests and manage your menu. This area is for authorized staff only.</p>{databaseConfigured() ? <LoginForm /> : <div className="notice">Staff sign-in will be available after Supabase is connected. Follow the setup instructions included with the application.</div>}<Link href="/" className="text-link">Back to the customer website</Link></div></main>;
}
