import { Sidebar } from "@/widgets/layout/ui/Sidebar";
import { Header } from "@/widgets/layout/ui/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background font-sans">
      <Sidebar />
      <main className="flex w-full flex-col md:pl-64 transition-all">
        <Header />
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
