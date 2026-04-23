import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppMetric = {
  key: string;
  value_number: number | null;
  value_text: string | null;
  label: string | null;
};

export type MetricsMap = Record<string, AppMetric>;

const cache: { current: MetricsMap | null } = { current: null };
const subscribers = new Set<(m: MetricsMap) => void>();
let inFlight: Promise<MetricsMap> | null = null;

const fetchMetrics = async (): Promise<MetricsMap> => {
  if (cache.current) return cache.current;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data } = await supabase
      .from("app_metrics")
      .select("key,value_number,value_text,label");
    const map: MetricsMap = {};
    (data ?? []).forEach((row: any) => {
      map[row.key] = row as AppMetric;
    });
    cache.current = map;
    subscribers.forEach((s) => s(map));
    inFlight = null;
    return map;
  })();
  return inFlight;
};

export const refreshMetrics = async () => {
  cache.current = null;
  return fetchMetrics();
};

export const useAppMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsMap>(cache.current ?? {});
  const [loading, setLoading] = useState(!cache.current);

  useEffect(() => {
    const cb = (m: MetricsMap) => setMetrics(m);
    subscribers.add(cb);
    fetchMetrics().then(() => setLoading(false));
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  return { metrics, loading };
};

export const formatNumber = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString();

export const formatCurrency = (cents: number | null | undefined): string =>
  cents == null ? "—" : `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
