import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/integrations/supabase/client";

export type MapPin = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
};

interface Props {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onPinClick?: (id: string) => void;
}

const PrinterMap = ({ pins, center, zoom = 11, className, onPinClick }: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("get-map-token").then(({ data, error }) => {
      if (error || !data?.token) setError(error?.message || "Map unavailable");
      else setToken(data.token);
    });
  }, []);

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    const initialCenter: [number, number] =
      center ?? (pins[0] ? [pins[0].lng, pins[0].lat] : [-73.95, 40.68]);

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${token}`,
      center: initialCenter,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (pins.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    pins.forEach((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "block h-8 w-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110";
      el.style.backgroundColor = p.color ?? "hsl(var(--primary))";
      if (p.label) el.title = p.label;
      el.onclick = () => onPinClick?.(p.id);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      if (p.label) marker.setPopup(new maplibregl.Popup({ offset: 18 }).setText(p.label));
      markersRef.current.push(marker);
      bounds.extend([p.lng, p.lat]);
    });

    if (pins.length > 1) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    } else {
      map.flyTo({ center: [pins[0].lng, pins[0].lat], zoom: 13, duration: 600 });
    }
  }, [pins, onPinClick]);

  if (error) {
    return (
      <div className={`grid place-items-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground ${className ?? ""}`}>
        Map unavailable: {error}
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
};

export default PrinterMap;
