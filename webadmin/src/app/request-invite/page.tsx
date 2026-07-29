"use client";

import { useState } from "react";
import { Copy, ExternalLink, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TroHubLogo } from "@/components/trohub-logo";
import { useNotification } from "@/hooks/use-notification";

export default function RequestInvitePage() {
  const notification = useNotification();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      notification.error("Số điện thoại phải gồm đúng 10 số!");
      setLoading(false);
      return;
    }

    const message = `Chào TroHub, tôi muốn yêu cầu cấp mã mời đăng ký Chủ trọ.\nThông tin đăng ký:\n- Họ tên: ${fullName.trim()}\n- SĐT liên hệ: ${cleanPhone}`;

    try {
      // Sao chép nội dung vào Clipboard
      await navigator.clipboard.writeText(message);
      setCopied(true);
      notification.success("Đã sao chép nội dung yêu cầu!");

      // Đợi 1 giây rồi chuyển hướng đến Zalo chat
      setTimeout(() => {
        window.open(`https://zalo.me/0584085384`, "_blank");
        setLoading(false);
      }, 1000);
    } catch (err) {
      // Fallback nếu không hỗ trợ clipboard
      notification.error("Không thể tự động sao chép. Vui lòng gửi tin nhắn thủ công qua Zalo.");
      window.open(`https://zalo.me/0584085384`, "_blank");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#04100e] px-4 py-10 text-foreground">
      <div className="w-full max-w-md space-y-8 rounded-[24px] bg-card p-6 shadow-2xl sm:p-9 border border-border/40">
        <div className="flex flex-col items-center text-center">
          <TroHubLogo className="[&_.text-foreground]:text-primary" />
          <h1 className="mt-6 text-2xl font-black tracking-tight text-foreground">
            Yêu cầu cấp mã mời
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Điền thông tin bên dưới để hệ thống chuẩn bị sẵn tin nhắn. Zalo sẽ tự động mở sau khi hoàn tất.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="font-bold text-foreground">
              Họ và tên của bạn
            </Label>
            <Input
              id="fullName"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="h-12 rounded-[16px] bg-background text-base placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="font-bold text-foreground">
              Số điện thoại đăng ký
            </Label>
            <Input
              id="phone"
              placeholder="Ví dụ: 0901234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              type="tel"
              className="h-12 rounded-[16px] bg-background text-base placeholder:text-muted-foreground focus-visible:ring-primary"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-[16px] bg-primary text-base font-extrabold text-primary-foreground shadow-lg transition-transform hover:bg-primary/90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              copied ? "Đang mở Zalo..." : "Đang chuẩn bị..."
            ) : (
              <>
                <Send className="size-4" />
                Tiếp tục gửi qua Zalo
              </>
            )}
          </Button>
        </form>

        {copied && (
          <div className="rounded-[16px] bg-primary/10 p-4 text-xs font-semibold leading-relaxed text-primary border border-primary/20 text-center animate-pulse">
            📋 Đã copy tin nhắn yêu cầu! Bạn chỉ cần nhấn Dán (Paste) khi cửa sổ Zalo mở ra và gửi đi.
          </div>
        )}

        <div className="flex gap-3 rounded-[16px] bg-accent/40 px-4 py-3 text-xs font-medium leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Thông tin của bạn chỉ dùng để định danh khi cấp mã mời kiểm thử hệ thống TroHub.</span>
        </div>
      </div>
    </main>
  );
}
