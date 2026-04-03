export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#FF3CAC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#2B86C5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
