import React from "react";
import type { FeatureIconToken } from "@/constants/feature-icons";

type FeatureIconBoxProps = {
  token: FeatureIconToken;
  size?: "sm" | "md" | "lg";
  isActive?: boolean;
  className?: string;
  ariaHidden?: boolean;
};

const SIZE_MAP = {
  sm: {
    box: "size-8 rounded-[10px]",
    icon: "size-4",
  },
  md: {
    box: "size-10 rounded-[12px]",
    icon: "size-5",
  },
  lg: {
    box: "size-12 rounded-[14px]",
    icon: "size-6",
  },
};

export function FeatureIconBox({
  token,
  size = "sm",
  isActive = false,
  className = "",
  ariaHidden = true,
}: FeatureIconBoxProps) {
  const config = SIZE_MAP[size] || SIZE_MAP.sm;
  const IconComponent = token.icon;

  if (isActive) {
    return (
      <span
        aria-hidden={ariaHidden}
        className={`grid place-items-center shrink-0 border border-white/30 bg-white/20 text-white shadow-sm transition-all duration-200 ${config.box} ${className}`}
      >
        <IconComponent className={config.icon} />
      </span>
    );
  }

  return (
    <span
      aria-hidden={ariaHidden}
      className={`grid place-items-center shrink-0 border transition-all duration-200 group-hover:scale-105 ${config.box} ${className}`}
      style={{
        backgroundColor: token.bg,
        borderColor: token.border || "transparent",
        color: token.color,
      }}
    >
      <IconComponent className={config.icon} />
    </span>
  );
}

export default FeatureIconBox;
