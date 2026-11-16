"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; action: string; size: "compact"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      remove: (id: string) => void;
    };
  }
}
export function Turnstile({ onToken, action = "catering-request" }: { onToken: (token: string) => void; action?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [error, setError] = useState("");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const mount = useCallback(() => {
    if (container.current && window.turnstile && widget.current === null && sitekey) {
      widget.current = window.turnstile.render(container.current, {
        sitekey, action, size: "compact", callback: token => { setError(""); onToken(token); },
        "expired-callback": () => onToken(""),
        "error-callback": () => { onToken(""); setError("Spam protection could not load. Check your connection and try again."); },
      });
    }
  }, [onToken, sitekey, action]);
  useEffect(() => {
    mount();
    return () => { if (widget.current !== null) { window.turnstile?.remove(widget.current); widget.current = null; } };
  }, [mount]);
  if (!sitekey) return null;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={mount} onError={() => setError("Spam protection could not load. Refresh the page to try again.")} /><div ref={container} className="captcha-container" />{error && <p role="alert" className="error">{error}</p>}</>;
}
