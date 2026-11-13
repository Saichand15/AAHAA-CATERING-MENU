"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="center-page"><div className="panel"><span className="eyebrow">Something went wrong</span><h1>Let&apos;s try that again.</h1><p>We couldn&apos;t load this page. No new request has been confirmed on this screen.</p><button className="button" onClick={reset}>Try again</button><Link className="text-link" href="/">Return home</Link></div></main>;
}
