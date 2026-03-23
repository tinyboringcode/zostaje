import { TopNav } from "@/components/layout/TopNav";
import { QuickAdd } from "@/components/quick-add/QuickAdd";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <TopNav />
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {children}
      </main>
      <QuickAdd />
    </div>
  );
}
