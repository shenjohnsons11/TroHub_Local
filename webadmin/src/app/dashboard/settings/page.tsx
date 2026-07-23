import Link from "next/link";
import { Landmark, ReceiptText, UserRound } from "lucide-react";

const items = [
  { href: "/dashboard/settings/account", title: "Tài khoản", description: "Thông tin Chủ trọ/Admin và mật khẩu.", icon: UserRound },
  { href: "/dashboard/settings/banking", title: "Ngân hàng", description: "Thông tin nhận tiền và VietQR.", icon: Landmark },
  { href: "/dashboard/settings/billing", title: "Chính sách hóa đơn", description: "Ngày ân hạn và tỷ lệ phạt một lần.", icon: ReceiptText },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header><p className="text-sm font-bold uppercase tracking-[.12em] text-primary">Thiết lập vận hành</p><h1 className="mt-1 text-3xl font-black tracking-[-.025em]">Cài đặt</h1></header>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="rounded-[14px] border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5">
            <Icon className="h-6 w-6 text-primary" />
            <h2 className="mt-5 text-lg font-black">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
