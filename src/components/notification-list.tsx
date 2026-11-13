import type { NotificationJob } from "@/lib/types";
import { RetryNotification } from "./staff-controls";

export function NotificationList({ jobs }: { jobs: NotificationJob[] }) {
  return <section className="panel"><h2>Email &amp; WhatsApp</h2>
    <p className="small-note">Provider accepted is not proof of inbox delivery. WhatsApp delivery/read statuses appear after verified webhooks. Check your email provider for email bounces.</p>
    {jobs.map(job => <div className="job" key={job.id}>
      <strong>{job.audience === "staff" ? "Manager notification" : "Customer receipt"} &middot; {job.channel === "whatsapp" ? "WhatsApp" : "Email"}</strong>
      <p>{job.recipient}</p>
      <div className="inline-actions">
        <span className={`status ${job.delivery_status === "failed" ? "failed" : job.status}`}>{job.delivery_status ?? (job.status === "sent" ? "Provider accepted" : job.status)}</span>
        <span>{job.attempts} attempt(s)</span>
      </div>
      {job.last_error && <p>{job.last_error}</p>}
      {job.provider_id && <p>Provider ID: {job.provider_id}</p>}
      {job.status === "failed" && <RetryNotification id={job.id} />}
    </div>)}
  </section>;
}
