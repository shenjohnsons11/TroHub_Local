"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  nguoiThueName: string;
  temporaryPassword: string;
  onOpenChange: (open: boolean) => void;
};

export function TemporaryPasswordDialog({
  open,
  nguoiThueName,
  temporaryPassword,
  onOpenChange,
}: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setCopied(false);
    onOpenChange(nextOpen);
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("i18n.temporaryPassword.title")}</DialogTitle>
          <DialogDescription>
            {t("i18n.temporaryPassword.description", { name: nguoiThueName })}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-[10px] bg-muted p-4">
          <p className="break-all font-mono text-lg font-black tracking-wide">
            {temporaryPassword}
          </p>
        </div>
        <Button onClick={copyPassword} className="h-11 w-full">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? t("i18n.temporaryPassword.copied") : t("i18n.temporaryPassword.copy")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
