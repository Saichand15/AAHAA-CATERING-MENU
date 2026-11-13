"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [router]);
  return <span className="small-note">Refreshes every 30 seconds while visible</span>;
}
