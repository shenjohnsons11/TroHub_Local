"use client";

import { useState } from "react";
import { FileText, Shield, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TermsAndPoliciesModal({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  const termsContentVi = [
    {
      id: "1",
      title: "1. Phạm vi áp dụng & Mục đích",
      content:
        "TroHub là nền tảng công nghệ quản lý vận hành phòng trọ và căn hộ dịch vụ, kết nối trực tiếp giữa Bên Cho Thuê (Chủ trọ) và Bên Thuê (Khách thuê). Khi đăng ký và sử dụng tài khoản, người dùng đồng ý tuân thủ toàn bộ quy chế hoạt động của TroHub.",
    },
    {
      id: "2",
      title: "2. Quyền & Trách nhiệm của Chủ trọ",
      content:
        "• Cung cấp thông tin phòng trọ, đơn giá thuê, chỉ số điện nước và các chi phí dịch vụ minh bạch, chính xác.\n• Tiếp nhận và xử lý kịp thời các yêu cầu bảo trì, sửa chữa thiết bị phòng thuộc trách nhiệm của chủ nhà.\n• Xuất hóa đơn đúng hạn và hoàn trả tiền đặt cọc theo thỏa thuận khi thanh lý hợp đồng hợp lệ.",
    },
    {
      id: "3",
      title: "3. Quyền & Trách nhiệm của Khách thuê",
      content:
        "• Cung cấp thông tin CCCD chính chủ để chủ trọ thực hiện thủ tục đăng ký tạm trú theo quy định pháp luật.\n• Thanh toán tiền phòng và các hóa đơn dịch vụ đúng thời hạn được ghi nhận trên ứng dụng.\n• Có ý thức giữ gìn tài sản chung, tuân thủ nội quy phòng trọ và báo cáo sự cố qua tính năng Sửa chữa khi phát sinh sự cố.",
    },
    {
      id: "4",
      title: "4. Hợp đồng điện tử & Chữ ký số",
      content:
        "Hợp đồng thuê phòng được lập và ký duyệt trực tiếp trên nền tảng TroHub có giá trị ràng buộc dân sự giữa hai bên. Bản sao lưu hợp đồng dưới định dạng PDF/DOCX được bảo lưu trên hệ thống để làm căn cứ pháp lý đối soát khi có tranh chấp phát sinh.",
    },
    {
      id: "5",
      title: "5. Thanh toán & Đối soát hóa đơn",
      content:
        "TroHub cung cấp giải pháp quét mã VietQR tự động điền số tiền và nội dung chuyển khoản. Mọi lịch sử thanh toán được ghi nhận tự động. TroHub không can thiệp vào tài khoản ngân hàng cá nhân của các bên.",
    },
    {
      id: "6",
      title: "6. Chấm dứt hợp đồng & Hoàn trả cọc",
      content:
        "Khi kết thúc thời hạn thuê hoặc một trong hai bên có yêu cầu trả phòng trước hạn, việc thanh lý và quyết toán công nợ sẽ được thực hiện qua quy trình Duyệt trả phòng trên ứng dụng, đảm bảo tính công bằng và minh bạch.",
    },
  ];

  const termsContentEn = [
    {
      id: "1",
      title: "1. Scope & Purpose",
      content:
        "TroHub is a property management and rental platform connecting Landlords and Tenants. By registering and using TroHub, users agree to strictly abide by all platform operating rules.",
    },
    {
      id: "2",
      title: "2. Landlord Obligations",
      content:
        "• Provide accurate information regarding room availability, pricing, utilities, and extra services.\n• Timely review and resolve maintenance/repair requests.\n• Issue transparent invoices and refund deposits in accordance with valid contract terms.",
    },
    {
      id: "3",
      title: "3. Tenant Obligations",
      content:
        "• Provide valid personal identification (National ID/Passport) for legal temporary residence registration.\n• Pay rental invoices and utility bills on or before due dates.\n• Maintain room hygiene, respect house rules, and report maintenance issues promptly.",
    },
    {
      id: "4",
      title: "4. Digital Contracts & E-Signatures",
      content:
        "Rental contracts executed on TroHub carry binding legal authority under civil agreement frameworks. Secure PDF/DOCX copies are archived for audit and dispute resolution purposes.",
    },
    {
      id: "5",
      title: "5. Billing & Payment Gateway",
      content:
        "TroHub provides automated VietQR code generation for fast banking transfers. Transaction logs are recorded transparently. TroHub does not store or process payment card data directly.",
    },
    {
      id: "6",
      title: "6. Checkout & Deposit Settlement",
      content:
        "When tenancy concludes, deposit deduction and final invoice settlement are processed transparently through TroHub's Checkout Approval workflow.",
    },
  ];

  const privacyContentVi = [
    {
      id: "p1",
      title: "1. Thu thập dữ liệu cá nhân",
      content:
        "Chúng tôi thu thập các thông tin cần thiết phục vụ quản lý cư trú bao gồm: Họ tên, Số điện thoại, Email, Số CCCD, Ngày sinh và Ảnh chân dung (từ ảnh chụp CCCD khi quét OCR hợp đồng).",
    },
    {
      id: "p2",
      title: "2. Mục đích sử dụng thông tin",
      content:
        "• Tự động điền biểu mẫu hợp đồng thuê trọ hợp lệ.\n• Gửi thông báo hóa đơn, nhắc nợ, lịch ghi điện nước và tiến độ xử lý phiếu sửa chữa.\n• Hỗ trợ xác thực tài khoản và khôi phục mật khẩu khi cần thiết.",
    },
    {
      id: "p3",
      title: "3. Bảo mật & Mã hóa thông tin",
      content:
        "• Mật khẩu tài khoản được mã hóa bằng thuật toán băm một chiều an toàn (bcrypt).\n• Phiên đăng nhập được xác thực thông qua mã JWT có thời hạn và lưu trữ trong bộ nhớ bảo mật của thiết bị.\n• Mọi luồng truyền tải dữ liệu giữa ứng dụng và máy chủ đều được mã hóa bằng chuẩn TLS/SSL cao cấp.",
    },
    {
      id: "p4",
      title: "4. Cam kết không chia sẻ cho bên thứ ba",
      content:
        "TroHub cam kết tuyệt đối KHÔNG bán, chia sẻ hoặc cho thuê dữ liệu cá nhân của người dùng cho bất kỳ đơn vị quảng cáo hoặc bên thứ ba nào khi chưa có sự đồng ý của bạn, trừ trường hợp cơ quan nhà nước có thẩm quyền yêu cầu theo quy định pháp luật.",
    },
    {
      id: "p5",
      title: "5. Quyền kiểm soát dữ liệu của người dùng",
      content:
        "Bạn có quyền chỉnh sửa thông tin hồ sơ, thay đổi mật khẩu hoặc yêu cầu vô hiệu hóa tài khoản khi đã chấm dứt toàn bộ nghĩa vụ trong hợp đồng thuê.",
    },
  ];

  const privacyContentEn = [
    {
      id: "p1",
      title: "1. Personal Data Collected",
      content:
        "We collect essential information required for tenancy management: Full name, Phone number, Email address, Citizen ID number, Date of birth, and identity photo (via OCR scanning for contracts).",
    },
    {
      id: "p2",
      title: "2. Purpose of Data Use",
      content:
        "• Auto-populate valid residential lease agreements.\n• Transmit notifications for invoices, utility readings, and maintenance progress.\n• Account verification and password recovery services.",
    },
    {
      id: "p3",
      title: "3. Data Protection & Encryption",
      content:
        "• Passwords are encrypted using robust one-way hashing (bcrypt).\n• Session authentications utilize tokenized JWT stored securely on the device.\n• All client-server traffic is transmitted under secure TLS/SSL protocols.",
    },
    {
      id: "p4",
      title: "4. Third-Party Sharing Commitment",
      content:
        "TroHub strictly adheres to a zero-sale policy: we NEVER sell, rent, or disclose personal user records to third-party advertisers without explicit user consent.",
    },
    {
      id: "p5",
      title: "5. User Privacy Rights",
      content:
        "You retain complete rights to access, amend, or request removal of your account data upon formal termination of active rental agreements.",
    },
  ];

  const currentTerms = isEn ? termsContentEn : termsContentVi;
  const currentPrivacy = isEn ? privacyContentEn : privacyContentVi;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-[24px]">
        <DialogHeader className="p-6 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                {isEn ? "Terms & Privacy Policies" : "Điều khoản & Chính sách"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn ? "TroHub Operational & Data Security Guidelines" : "Quy chế hoạt động & Tiêu chuẩn bảo mật dữ liệu TroHub"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 bg-muted/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "terms"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-4" />
              {isEn ? "Terms of Service" : "Điều khoản sử dụng"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "privacy"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="size-4" />
              {isEn ? "Privacy Policy" : "Chính sách bảo mật"}
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm leading-relaxed">
          {activeTab === "terms" ? (
            currentTerms.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-card border border-border/40 shadow-xs">
                <h4 className="font-bold text-foreground mb-1.5">{item.title}</h4>
                <p className="text-muted-foreground whitespace-pre-line text-xs sm:text-sm">{item.content}</p>
              </div>
            ))
          ) : (
            currentPrivacy.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-card border border-border/40 shadow-xs">
                <h4 className="font-bold text-foreground mb-1.5">{item.title}</h4>
                <p className="text-muted-foreground whitespace-pre-line text-xs sm:text-sm">{item.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 font-bold"
          >
            {isEn ? "Understood & Agreed" : "Đã hiểu & Đồng ý"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
