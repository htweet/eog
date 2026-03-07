import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteConfig {
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  minBountyAmount: number;
  platformFeePercent: number;
  defaultCurrency: string;
  siteName: string;
}

export interface StreamConfig {
  enableLiveStreaming: boolean;
  autoRecordStreams: boolean;
  maxStreamDuration: number;
  requireApproval: boolean;
  allowRewatch: boolean;
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  maintenanceMode: false,
  allowNewSignups: true,
  minBountyAmount: 500,
  platformFeePercent: 5,
  defaultCurrency: "NGN",
  siteName: "Vouch",
};

const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enableLiveStreaming: true,
  autoRecordStreams: true,
  maxStreamDuration: 30,
  requireApproval: false,
  allowRewatch: true,
};

export function usePlatformSettings() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [streamConfig, setStreamConfig] = useState<StreamConfig>(DEFAULT_STREAM_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel("platform-settings-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_settings" }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("setting_key, setting_value");

    if (data) {
      for (const row of data) {
        if (row.setting_key === "site_config") {
          setSiteConfig({ ...DEFAULT_SITE_CONFIG, ...(row.setting_value as object) });
        } else if (row.setting_key === "stream_config") {
          setStreamConfig({ ...DEFAULT_STREAM_CONFIG, ...(row.setting_value as object) });
        }
      }
    }
    setLoading(false);
  };

  return { siteConfig, streamConfig, loading, refetch: fetchSettings };
}
