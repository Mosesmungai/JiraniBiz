export type LocationCoordinates = {
  label: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_CITY_COORDINATES: Record<string, LocationCoordinates> = {
  nairobi: { label: "Nairobi, Kenya", latitude: -1.286389, longitude: 36.817223 },
  westlands: { label: "Westlands, Nairobi, Kenya", latitude: -1.2648, longitude: 36.8073 },
  kilimani: { label: "Kilimani, Nairobi, Kenya", latitude: -1.2926, longitude: 36.7876 },
  mombasa: { label: "Mombasa, Kenya", latitude: -4.043477, longitude: 39.668206 },
  kisumu: { label: "Kisumu, Kenya", latitude: -0.1022, longitude: 34.7617 },
  kampala: { label: "Kampala, Uganda", latitude: 0.347596, longitude: 32.58252 },
  entebbe: { label: "Entebbe, Uganda", latitude: 0.0515, longitude: 32.4605 },
  dar: { label: "Dar es Salaam, Tanzania", latitude: -6.7924, longitude: 39.2083 },
  "dar es salaam": { label: "Dar es Salaam, Tanzania", latitude: -6.7924, longitude: 39.2083 },
  arusha: { label: "Arusha, Tanzania", latitude: -3.3869, longitude: 36.682 },
};

export async function geocodeBusinessLocation(
  city: string,
  area: string,
  country?: string,
): Promise<LocationCoordinates> {
  const query = [area, city, country].filter(Boolean).join(", ").trim();
  const fallback = DEFAULT_CITY_COORDINATES[city.toLowerCase()] ?? DEFAULT_CITY_COORDINATES[area.toLowerCase()] ?? {
    label: `${area || city}, ${country || "Kenya"}`,
    latitude: -1.286389,
    longitude: 36.817223,
  };

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query || city)}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "JiraniBiz/1.0 (+https://jiranibiz.local)",
        },
      },
    );

    if (!response.ok) {
      return fallback;
    }

    const results = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const match = results[0];

    if (!match?.lat || !match?.lon) {
      return fallback;
    }

    return {
      label: match.display_name || query || fallback.label,
      latitude: Number(match.lat),
      longitude: Number(match.lon),
    };
  } catch {
    return fallback;
  }
}

export function getDistanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
