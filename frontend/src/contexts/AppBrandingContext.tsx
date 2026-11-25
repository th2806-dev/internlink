import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminSettingsService, type AppBrandingSettings } from "../services/adminSettings.service";
import { API_BASE_URL } from "../config/env";

const DEFAULT_BRANDING: AppBrandingSettings = {
  appName: "InternLink",
  appShortName: "InternLink",
  browserTitle: "{appName} - Nền tảng quản lý thực tập",
  copyrightText: "© {year} {appName} · {companyName}",
  appUrl: "http://localhost:3000",
  appLogoUrl: "/logo/logo_internlink-02.png",
  appFaviconUrl: "/logo/logo_internlink-02.png",
  appPrimaryColor: "#026aa7",
  companyName: "CÔNG TY CỔ PHẦN CÔNG NGHỆ INTERNLINK",
  companyTaxCode: "0109887766",
  companyAddress: "Tầng 8, Tòa nhà Công nghệ, Cầu Giấy, Hà Nội",
  companyHotline: "1900 8899",
  billingEmail: "billing@internlink.vn",
};

interface AppBrandingContextValue {
  branding: AppBrandingSettings;
  refreshBranding: () => Promise<void>;
  setBranding: (branding: AppBrandingSettings) => void;
}

const AppBrandingContext = createContext<AppBrandingContextValue | null>(null);

export function resolveAppAssetUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url)) return url;
  if (!url.startsWith("/")) return url;
  const base = API_BASE_URL.replace(/\/+$/, "");
  return base ? `${base}${url}` : url;
}

export function formatBrandingText(
  template: string,
  values: Pick<AppBrandingSettings, "appName" | "companyName"> & { year: number },
): string {
  return template
    .replace(/\{appName\}/g, values.appName)
    .replace(/\{companyName\}/g, values.companyName)
    .replace(/\{year\}/g, String(values.year));
}

export function AppBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<AppBrandingSettings>(DEFAULT_BRANDING);

  const setBranding = (value: AppBrandingSettings) => {
    setBrandingState({
      ...value,
      appLogoUrl: resolveAppAssetUrl(value.appLogoUrl),
      appFaviconUrl: resolveAppAssetUrl(value.appFaviconUrl),
    });
  };

  const refreshBranding = async () => {
    try {
      const value = await adminSettingsService.getBranding();
      setBrandingState({
        ...value,
        appLogoUrl: resolveAppAssetUrl(value.appLogoUrl),
        appFaviconUrl: resolveAppAssetUrl(value.appFaviconUrl),
      });
    } catch {
      setBrandingState(DEFAULT_BRANDING);
    }
  };

  useEffect(() => {
    void refreshBranding();
  }, []);

  useEffect(() => {
    document.title = formatBrandingText(branding.browserTitle, {
      appName: branding.appName,
      companyName: branding.companyName,
      year: new Date().getFullYear(),
    });
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = resolveAppAssetUrl(branding.appFaviconUrl);
    document.documentElement.style.setProperty("--il-brand-primary", branding.appPrimaryColor);
  }, [branding]);

  return (
    <AppBrandingContext.Provider value={{ branding, refreshBranding, setBranding }}>
      {children}
    </AppBrandingContext.Provider>
  );
}

export function useAppBranding(): AppBrandingContextValue {
  const context = useContext(AppBrandingContext);
  return context ?? {
    branding: DEFAULT_BRANDING,
    refreshBranding: async () => undefined,
    setBranding: () => undefined,
  };
}
