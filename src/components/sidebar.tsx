"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, FileText, Settings, Scroll, LineChart, History, FlaskConical } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "홈", href: "/dashboard" },
  { icon: LineChart, label: "시장 탐색", href: "/market" },
  { icon: TrendingUp, label: "거래하기", href: "/order" },
  { icon: History, label: "거래 기록", href: "/history" },
  { icon: Scroll, label: "나의 유언장", href: "/will" },
  { icon: FileText, label: "거래 보고서", href: "/reports" },
  { icon: FlaskConical, label: "백테스트", href: "/backtest" },
  { icon: Settings, label: "설정", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 bg-card border-r border-border h-screen sticky top-0 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-border">
        <Link href="/dashboard" className="block text-left">
          <p className="text-[22px] font-black tracking-tight text-foreground leading-none">故래소</p>
          <p className="text-[10px] tracking-[0.15em] text-muted-foreground mt-1.5 uppercase">투자 유언장 거래 서비스</p>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-border/60">
        <p className="text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase mb-2">문서 분류</p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={label}
                href={href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-1" />

      <div className="p-3 mx-3 mb-4 bg-[#FDF8EC] border border-[#C9A227]/30">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 bg-[#C9A227] block shrink-0" />
          <span className="text-[10px] font-bold text-[#7A5F0E] tracking-wider">유언장 알림</span>
        </div>
        <p className="text-[10px] text-[#7A5F0E]/70 leading-relaxed">프리마켓 주문 전 제2조를 확인하세요.</p>
      </div>
    </aside>
  );
}
