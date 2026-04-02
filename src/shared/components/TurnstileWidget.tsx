"use client";

import { useEffect, useRef } from "react";

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  theme?: "light" | "dark" | "auto";
}

export function TurnstileWidget({ siteKey, onVerify, theme = "auto" }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Turnstile script
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      if (containerRef.current && (window as any).turnstile) {
        (window as any).turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: onVerify,
        });
      }
    };

    // Wait for script to load
    const interval = setInterval(() => {
      if ((window as any).turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [siteKey, onVerify, theme]);

  return <div ref={containerRef} />;
}
