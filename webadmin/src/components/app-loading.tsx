import Image from "next/image";
import { TroHubLogo } from "@/components/trohub-logo";

export function AppLoading({ message = "Đang chuẩn bị không gian của bạn" }: { message?: string }) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <TroHubLogo />
      <div className="app-loading-frame" aria-hidden="true">
        <Image
          src="/trohub-property-loading.png"
          alt=""
          width={700}
          height={438}
          priority
        />
      </div>
      <span className="app-loading-track" aria-hidden="true"><i /></span>
      <p>{message}</p>
    </div>
  );
}
