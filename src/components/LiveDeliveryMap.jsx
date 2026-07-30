import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Warehouse, Home, MapPin } from "lucide-react";
import {
  normalizeCoords,
  isValidCoords,
  fetchOsrmRoute,
  buildCurvedRoute,
  geocodeAddress,
  positionAlongRoute,
} from "../lib/mapHelpers";

const COLORS = {
  warehouse: "#0F766E",
  hub: "#F59E0B",
  vehicle: "#FF3E6C",
  customer: "#10B981",
};

function pinIcon(color, size = 26) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid white;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function vehicleIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${COLORS.vehicle};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(255,62,108,0.5);border:3px solid white;color:white;font-size:15px;line-height:1;">🚚</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
  }, [points, map]);
  return null;
}

export default function LiveDeliveryMap({
  warehouseCoords,
  customerCoords,
  warehouseLabel = "Warehouse",
  warehouseAddress,
  customerAddress,
  deliveryPartner,
  statusProgress = 0,
  expectedDeliveryLabel,
  status,
}) {
  const [resolvedWarehouse, setResolvedWarehouse] = useState(
    normalizeCoords(warehouseCoords)
  );
  const [resolvedCustomer, setResolvedCustomer] = useState(
    normalizeCoords(customerCoords)
  );
  const [routePoints, setRoutePoints] = useState(null);
  const [usingFallbackRoute, setUsingFallbackRoute] = useState(false);
  const [creep, setCreep] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      let wh = normalizeCoords(warehouseCoords);
      let cu = normalizeCoords(customerCoords);

      if (!wh && warehouseAddress) {
        wh = await geocodeAddress(warehouseAddress);
      }
      if (!cu && customerAddress) {
        cu = await geocodeAddress(customerAddress);
      }
      if (cancelled) return;

      setResolvedWarehouse(wh);
      setResolvedCustomer(cu);
      setLastUpdated(Date.now());

      if (!wh || !cu) {
        setRoutePoints(null);
        return;
      }

      const osrm = await fetchOsrmRoute(wh, cu);
      if (cancelled) return;

      if (osrm) {
        setRoutePoints(osrm);
        setUsingFallbackRoute(false);
      } else {
        setRoutePoints(buildCurvedRoute(wh, cu));
        setUsingFallbackRoute(true);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [warehouseCoords, customerCoords, warehouseAddress, customerAddress]);

  useEffect(() => {
    const start = performance.now();
    const durationMs = 20000;
    const maxCreep = 0.04;

    function tick(now) {
      const elapsed = (now - start) % durationMs;
      const t = elapsed / durationMs;
      setCreep(maxCreep * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI)));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [statusProgress]);

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const effectiveProgress = Math.min(0.98, statusProgress + creep);

  const stats = useMemo(() => {
    if (!routePoints) return null;
    return positionAlongRoute(routePoints, effectiveProgress);
  }, [routePoints, effectiveProgress]);

  const hubPoint = useMemo(() => {
    if (!routePoints) return null;
    return positionAlongRoute(routePoints, 0.45)?.position || null;
  }, [routePoints]);

  const minutesAgo = Math.max(0, Math.round((Date.now() - lastUpdated) / 60000));
  const hasMap = resolvedWarehouse && resolvedCustomer && routePoints;
  const boundsPoints = hasMap
    ? [resolvedWarehouse, resolvedCustomer, stats?.position].filter(Boolean)
    : null;

  const etaLabel = useMemo(() => {
    if (!stats) return expectedDeliveryLabel || "Calculating…";
    const assumedSpeedKmh = 22;
    const hoursLeft = stats.distanceRemainingKm / assumedSpeedKmh;
    const arrival = new Date(Date.now() + hoursLeft * 3600 * 1000);
    return arrival.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }, [stats, expectedDeliveryLabel]);

  if (!hasMap) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#EAF3EE]">
        <div className="flex items-center gap-2 text-xs text-[#7E818C]">
          <MapPin size={14} className="text-[#FF3E6C]" />
          Locating your delivery route…
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <style>{`
        .leaflet-tooltip.map-label {
          background: white; border: none; border-radius: 9999px;
          padding: 2px 8px; font-size: 9px; font-weight: 700; color: #282C3F;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .leaflet-tooltip.map-label::before { display: none; }
      `}</style>

      <div className="absolute left-3 top-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow text-[10px] font-semibold text-[#282C3F] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#03A685] animate-pulse" />
        Live Tracking · updated {minutesAgo === 0 ? "just now" : `${minutesAgo} min ago`}
      </div>

      <MapContainer
        center={resolvedWarehouse}
        zoom={12}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <FitBounds points={boundsPoints} />

        <Polyline
          positions={routePoints}
          pathOptions={{
            color: "#FF3E6C",
            weight: 4,
            opacity: 0.85,
            dashArray: usingFallbackRoute ? "8 6" : undefined,
          }}
        />

        <Marker position={resolvedWarehouse} icon={pinIcon(COLORS.warehouse)}>
          <Tooltip permanent direction="top" offset={[0, -20]} className="map-label">
            {warehouseLabel}
          </Tooltip>
        </Marker>

        {hubPoint && (
          <Marker position={hubPoint} icon={pinIcon(COLORS.hub, 20)}>
            <Tooltip permanent direction="top" offset={[0, -16]} className="map-label">
              Sorting Hub
            </Tooltip>
          </Marker>
        )}

        <Marker position={resolvedCustomer} icon={pinIcon(COLORS.customer)}>
          <Tooltip permanent direction="top" offset={[0, -20]} className="map-label">
            Your Location
          </Tooltip>
        </Marker>

        {stats?.position && (
          <Marker position={stats.position} icon={vehicleIcon()}>
            <Tooltip permanent direction="top" offset={[0, -18]} className="map-label">
              On the way
            </Tooltip>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute right-2 bottom-2 z-[1000] grid grid-cols-2 gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 p-2 shadow-sm">
        <div className="px-2">
          <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Distance</p>
          <p className="text-xs font-bold text-[#111827]">{stats ? `${stats.distanceRemainingKm.toFixed(1)} km` : "—"}</p>
        </div>
        <div className="px-2">
          <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">ETA</p>
          <p className="text-xs font-bold text-[#03A685]">{etaLabel}</p>
        </div>
        {deliveryPartner && (
          <div className="px-2 col-span-2 border-t border-gray-100 pt-1.5 mt-0.5">
            <p className="text-[9px] uppercase tracking-wide text-[#94A3B8]">Courier</p>
            <p className="text-xs font-semibold text-[#111827]">{deliveryPartner}</p>
          </div>
        )}
      </div>

      <div className="absolute left-3 bottom-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 px-3 py-2 shadow-sm">
        <p className="text-[11px] font-semibold text-[#111827] leading-tight">
          Status: <span className="text-[#FF3E6C]">{(status || "").replace(/_/g, " ")}</span>
        </p>
      </div>
    </div>
  );
}
