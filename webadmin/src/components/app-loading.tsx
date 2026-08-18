import Image from "next/image";

export function AppLoading({ message = "Đang tải dữ liệu ứng dụng..." }: { message?: string }) {
  return (
    <div className="app-loading" role="status" aria-live="polite" aria-label={message}>
      <div className="app-loading-logo" aria-hidden="true">
        <Image
          src="/logo_3d_glass.png"
          alt=""
          width={224}
          height={224}
          priority
        />
      </div>
      <span className="app-loading-ring" aria-hidden="true" />
      <p>TroHub - Hệ Sinh Thái Quản Lý Nhà Trọ Thông Minh</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}
