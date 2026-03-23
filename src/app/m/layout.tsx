import { MobileBottomNav } from "@/components/mobile/BottomNav";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 56 }}>
      {children}
      <MobileBottomNav />
    </div>
  );
}
