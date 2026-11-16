import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/staff-controls";
import { databaseConfigured } from "@/lib/config";
export default function Login() {
  return <main className="center-page"><div className="panel customer-login admin-login">
    <header className="customer-login-heading">
      <Brand />
      <h1 className="eyebrow">ADMIN &amp; MANAGER LOGIN</h1>
      <p>Manage catering enquiries, customer chats and menu updates. Authorized staff only.</p>
    </header>
    {databaseConfigured() ? <LoginForm /> : <div className="notice">Staff sign-in will be available after Supabase is connected. Follow the setup instructions included with the application.</div>}
    <div className="customer-login-footer"><Link href="/" className="text-link">Back to the customer website</Link></div>
  </div></main>;
}
