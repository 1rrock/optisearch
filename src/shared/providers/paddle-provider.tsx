"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { toast } from "sonner";

const PaddleContext = createContext<Paddle | null>(null);

export function usePaddle() {
  return useContext(PaddleContext);
}

export function PaddleProvider({ children }: { children: ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    initializePaddle({
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production") ?? "sandbox",
      token,
      eventCallback: (event) => {
        // Global error handling fallback
        if (
          event.name === "checkout.error" || 
          event.name === "checkout.failed" || 
          event.name === "checkout.payment.failed"
        ) {
          console.error("[Paddle] Checkout Error:", event);
          toast.error("결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
      }
    }).then((instance) => {
      if (instance) setPaddle(instance);
    });
  }, []);

  return (
    <PaddleContext.Provider value={paddle}>
      {children}
    </PaddleContext.Provider>
  );
}
