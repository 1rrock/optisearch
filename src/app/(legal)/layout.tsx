export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">← 홈으로</a>
        {children}
      </div>
    </div>
  );
}
