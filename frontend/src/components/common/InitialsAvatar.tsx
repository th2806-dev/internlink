import React from "react";

/** Generate a deterministic gradient from a name string. */
function nameToGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 55%), hsl(${hue2}, 65%, 45%))`;
}

/** Extract up to 2 initials from a full name. */
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface InitialsAvatarProps {
  name: string;
  seed?: string;
  size?: number | "sm";
  className?: string;
}

export function InitialsAvatar({
  name,
  seed,
  size = 32,
  className = "",
}: InitialsAvatarProps) {
  const initials = getInitials(name);
  const gradient = nameToGradient(seed || name);
  const normalizedSize = typeof size === "number" ? size : size === "sm" ? 24 : 32;

  return (
    <div
      className={`flex items-center justify-center shrink-0 rounded-full text-white font-bold shadow-sm select-none ${className}`}
      style={{
        width: normalizedSize,
        height: normalizedSize,
        background: gradient,
        fontSize: normalizedSize * 0.38,
        lineHeight: 1,
      }}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
