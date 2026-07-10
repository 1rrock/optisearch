"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string | undefined;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile 위젯을 렌더링하고 검증 토큰을 반환합니다.
 *
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY가 없으면(로컬 개발) 위젯을 띄우지 않고
 * "dev-bypass"를 토큰으로 내보냅니다. 서버도 development에서만 이를 통과시킵니다.
 */
export function useTurnstile(theme: "light" | "dark" | "auto" = "auto") {
  const [token, setToken] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;

    const render = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current =
        window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          callback: setToken,
          "expired-callback": () => setToken(""),
        }) ?? null;
    };

    if (window.turnstile) {
      render();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );
    if (existing) {
      existing.addEventListener("load", render, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render, { once: true });
    document.head.appendChild(script);
  }, [theme]);

  // 토큰은 1회용이다. 제출 후 반드시 reset해야 다음 요청에서 재검증된다.
  const reset = useCallback(() => {
    setToken("");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, []);

  return {
    containerRef,
    enabled: Boolean(SITE_KEY),
    submitToken: SITE_KEY ? token : "dev-bypass",
    ready: SITE_KEY ? Boolean(token) : true,
    reset,
  };
}
