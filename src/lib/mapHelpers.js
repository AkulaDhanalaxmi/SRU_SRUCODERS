export function normalizeCoords(coords) {
  if (!coords) return null;

  if (Array.isArray(coords) && coords.length >= 2) {
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return null;
  }

  if (typeof coords === "object" && coords !== null) {
    const lat = Number(coords.lat ?? coords.latitude ?? coords[0]);
    const lng = Number(coords.lng ?? coords.longitude ?? coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }

  return null;
}

export function isValidCoords(coords) {
  return normalizeCoords(coords) !== null;
}

function buildAddressQueries(address) {
  if (!address) return [];

  if (typeof address === "string") {
    const full = address.trim();
    return full ? [full] : [];
  }

  const line1 = address.line1?.trim();
  const city = address.city?.trim();
  const state = address.state?.trim();
  const pin = address.pin?.trim();
  const country = "India";
  const queries = [];

  const addQuery = (...parts) => {
    const list = parts.filter(Boolean).map((part) => String(part).trim()).filter(Boolean);
    if (!list.length) return;
    const query = list.join(", ");
    if (!queries.includes(query)) {
      queries.push(query);
    }
  };

  addQuery(line1, city, state, pin, country);
  addQuery(city, state, pin, country);
  addQuery(city, state, country);
  addQuery(pin, country);
  addQuery(city, country);

  return queries;
}

export async function geocodeAddress(address) {
  const queries = buildAddressQueries(address);
  if (!queries.length) return null;

  for (const query of queries) {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (!data?.length) continue;
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return [lat, lon];
      }
    } catch {
      // ignore and try next query
    }
  }

  return null;
}

export async function fetchOsrmRoute(start, end) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

export function buildCurvedRoute(start, end) {
  const [aLat, aLng] = start;
  const [bLat, bLng] = end;
  const midLat = (aLat + bLat) / 2;
  const midLng = (aLng + bLng) / 2;
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const length = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(0.5, Math.max(0.15, length * 0.08));
  const normalX = -dy / (length || 1);
  const normalY = dx / (length || 1);
  const controlLat = midLat + normalY * offset;
  const controlLng = midLng + normalX * offset;

  const points = [];
  const segments = 60;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    const lat = inv * inv * aLat + 2 * inv * t * controlLat + t * t * bLat;
    const lng = inv * inv * aLng + 2 * inv * t * controlLng + t * t * bLng;
    points.push([lat, lng]);
  }
  return points;
}

export function positionAlongRoute(route, progress) {
  if (!Array.isArray(route) || route.length < 2) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const distances = [];
  let total = 0;
  for (let i = 1; i < route.length; i += 1) {
    const [lat1, lng1] = route[i - 1];
    const [lat2, lng2] = route[i];
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const rLat1 = lat1 * (Math.PI / 180);
    const rLat2 = lat2 * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
      + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(rLat1) * Math.cos(rLat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const segmentKm = 6371 * c;
    distances.push(segmentKm);
    total += segmentKm;
  }

  let remaining = clamped * total;
  for (let i = 1; i < route.length; i += 1) {
    if (remaining <= distances[i - 1]) {
      const ratio = distances[i - 1] === 0 ? 0 : remaining / distances[i - 1];
      const [lat1, lng1] = route[i - 1];
      const [lat2, lng2] = route[i];
      return {
        position: [lat1 + (lat2 - lat1) * ratio, lng1 + (lng2 - lng1) * ratio],
        distanceRemainingKm: total - clamped * total,
      };
    }
    remaining -= distances[i - 1];
  }

  return { position: route[route.length - 1], distanceRemainingKm: 0 };
}
