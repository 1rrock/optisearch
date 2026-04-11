"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";

export interface TurnstileRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
}

export const TurnstileWidget = forwardRef<TurnstileRef, TurnstileWidgetProps>(
  function TurnstileWidget({ siteKey, onVerify, onExpire, theme = "auto", className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

    const reset = useCallback(() => {
      if (isDev) return;
      if (widgetIdRef.current !== null && (window as any).turnstile) {
        (window as any).turnstile.reset(widgetIdRef.current);
      }
    }, [isDev]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    useEffect(() => {
      // localhost에서는 Turnstile을 렌더하지 않고 즉시 bypass (110200 도메인 오류 방지)
      if (isDev) {
        onVerify("dev-bypass-token");
        return;
      }

      // Load Turnstile script once
      if (!document.getElementById("cf-turnstile-script")) {
        const script = document.createElement("script");
        script.id = "cf-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }

      const renderWidget = () => {
        if (containerRef.current && (window as any).turnstile && !widgetIdRef.current) {
          widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            appearance: "interaction-only",
            callback: onVerify,
            "expired-callback": onExpire,
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

      return () => {
        clearInterval(interval);
        // Remove widget on unmount
        if (widgetIdRef.current !== null && (window as any).turnstile) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore cleanup errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div ref={containerRef} className={className} />;
  }
);
