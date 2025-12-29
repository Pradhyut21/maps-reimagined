export type OsmLatLng = {
  lat: number;
  lng: number;
};

export type OsmPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
};

export const getOsmDirectionsUrl = (origin: OsmLatLng, destination: OsmLatLng) => {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(o)}%3B${encodeURIComponent(d)}`;
};

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
];

const cache = new Map<string, { at: number; data: OsmPlace[] }>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const overpassFetch = async (query: string): Promise<any> => {
  let lastErr: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // 429/504 etc: retry other endpoint with backoff
        throw new Error(`Overpass error: ${res.status}`);
      }

      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      lastErr = e;
      await sleep(400 * (attempt + 1));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('Overpass request failed');
};

export const fetchNearbyOsmPlaces = async (
  origin: OsmLatLng,
  options: {
    radiusMeters: number;
    kinds: Array<'restaurant' | 'hospital' | 'police' | 'attraction' | 'bus_station'>;
    limit?: number;
    query?: string;
  }
): Promise<OsmPlace[]> => {
  const radius = Math.max(100, Math.min(options.radiusMeters, 50_000));
  const limit = Math.max(1, Math.min(options.limit ?? 30, 50));

  const kindToOverpass: Record<string, string[]> = {
    restaurant: ['node[amenity=restaurant]', 'way[amenity=restaurant]', 'relation[amenity=restaurant]'],
    hospital: ['node[amenity=hospital]', 'way[amenity=hospital]', 'relation[amenity=hospital]'],
    police: ['node[amenity=police]', 'way[amenity=police]', 'relation[amenity=police]'],
    bus_station: [
      'node[amenity=bus_station]',
      'way[amenity=bus_station]',
      'relation[amenity=bus_station]',
      'node[highway=bus_stop]',
      'way[highway=bus_stop]',
      'relation[highway=bus_stop]',
    ],
    attraction: [
      'node[tourism=attraction]',
      'way[tourism=attraction]',
      'relation[tourism=attraction]',
      'node[tourism=museum]',
      'way[tourism=museum]',
      'relation[tourism=museum]',
      'node[historic]',
      'way[historic]',
      'relation[historic]',
      'node[amenity=place_of_worship]',
      'way[amenity=place_of_worship]',
      'relation[amenity=place_of_worship]',
    ],
  };

  const parts = options.kinds.flatMap((k) => kindToOverpass[k] ?? []);
  if (parts.length === 0) return [];

  const around = `(around:${radius},${origin.lat},${origin.lng})`;
  const q = `[
    out:json
  ][timeout:25];(
    ${parts.map((p) => `${p}${around};`).join('\n    ')}
  );out center ${limit};`;

  const queryLower = (options.query ?? '').trim().toLowerCase();
  const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}|${radius}|${options.kinds.join(',')}|${queryLower}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60_000) {
    return cached.data;
  }

  const data = (await overpassFetch(q)) as { elements?: any[] };
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const mapped: OsmPlace[] = elements
    .map((el) => {
      const tags: Record<string, string> = el.tags ?? {};
      const lat = typeof el.lat === 'number' ? el.lat : el.center?.lat;
      const lng = typeof el.lon === 'number' ? el.lon : el.center?.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      const rawName = (tags.name || tags.brand || tags.operator || '').trim();
      if (!rawName) return null;
      const name = rawName;
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:suburb'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
        tags['addr:state'],
      ].filter(Boolean);
      const address = addressParts.join(', ');

      return {
        id: `${el.type}/${el.id}`,
        name,
        address,
        lat,
        lng,
        tags,
      } satisfies OsmPlace;
    })
    .filter(Boolean) as OsmPlace[];

  const filtered = queryLower
    ? mapped.filter((p) => p.name.toLowerCase().includes(queryLower) || p.address.toLowerCase().includes(queryLower))
    : mapped;

  const result = filtered.slice(0, limit);
  cache.set(cacheKey, { at: Date.now(), data: result });
  return result;
};
