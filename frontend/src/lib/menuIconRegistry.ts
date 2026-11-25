import {
  Activity,
  Archive,
  Award,
  Bell,
  BellRing,
  Building2,
  Calendar,
  CalendarCheck,
  Circle,
  ClipboardList,
  Columns3,
  DatabaseBackup,
  FileSliders,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  ReceiptText,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

const MENU_ICONS: Record<string, LucideIcon> = {
  Activity,
  Archive,
  Award,
  Bell,
  BellRing,
  Building2,
  Calendar,
  CalendarCheck,
  Circle,
  ClipboardList,
  Columns3,
  DatabaseBackup,
  FileSliders,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  ReceiptText,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  Users,
  Webhook,
};

export function getMenuIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Circle;
  const icon = MENU_ICONS[iconName];
  if (icon) return icon;
  if (import.meta.env.DEV) console.warn(`Unsupported menu icon: ${iconName}`);
  return Circle;
}

export function isRegisteredMenuIcon(iconName: string | null): boolean {
  return Boolean(iconName && MENU_ICONS[iconName]);
}
