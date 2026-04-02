import { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center">
        {children}
      </main>
    </div>
  );
}
