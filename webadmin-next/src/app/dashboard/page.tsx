"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/rooms");
  }, [router]);

  return <div className="p-8 text-slate-500">Đang chuyển hướng...</div>;
}
