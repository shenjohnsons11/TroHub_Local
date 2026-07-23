import { TroHubLogo } from "@/components/trohub-logo";

export function AppLoading({ message = "Đang chuẩn bị không gian của bạn" }: { message?: string }) {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <TroHubLogo />
      <span className="app-loading-track" aria-hidden="true"><i /></span>
      <p>{message}</p>
    </div>
  );
}
