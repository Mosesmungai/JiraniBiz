export type PreferenceLocation = {
  country: string;
  city: string;
  area: string;
};

export type RecentSearch = {
  query: string;
  category: string;
  location: PreferenceLocation | null;
  createdAt: string;
};

export type RecentBusinessView = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  area: string;
  viewedAt: string;
};

export type PreferredCategory = {
  name: string;
  updatedAt: string;
};

export type PreferredLocation = PreferenceLocation & {
  updatedAt: string;
};

export type DiscoveryPreferences = {
  recentSearches: RecentSearch[];
  recentlyViewedBusinesses: RecentBusinessView[];
  preferredCategories: PreferredCategory[];
  preferredLocations: PreferredLocation[];
};

export const DISCOVERY_PREFERENCES_STORAGE_KEY = "jiranibiz.discovery-preferences.v1";
export const DISCOVERY_COUNTRIES = ["Kenya", "Uganda", "Tanzania"] as const;
export const MAX_RECENT_SEARCHES = 10;
export const MAX_RECENTLY_VIEWED = 20;
export const MAX_PREFERRED_CATEGORIES = 6;
export const MAX_PREFERRED_LOCATIONS = 10;

export function emptyDiscoveryPreferences(): DiscoveryPreferences {
  return {
    recentSearches: [],
    recentlyViewedBusinesses: [],
    preferredCategories: [],
    preferredLocations: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function parseLocation(value: unknown): PreferenceLocation | null {
  if (value === null) return null;
  if (!isRecord(value)) return null;
  const country = boundedString(value.country, 80);
  const city = boundedString(value.city, 80);
  const area = value.area === "" ? "" : boundedString(value.area, 80);
  if (
    !country ||
    !DISCOVERY_COUNTRIES.some((supportedCountry) => supportedCountry === country) ||
    !city ||
    area === null
  ) return null;
  return { country, city, area };
}

export function parseDiscoveryPreferences(value: unknown): DiscoveryPreferences | null {
  if (!isRecord(value)) return null;
  const {
    recentSearches,
    recentlyViewedBusinesses,
    preferredCategories,
    preferredLocations,
  } = value;
  if (
    !Array.isArray(recentSearches) ||
    recentSearches.length > MAX_RECENT_SEARCHES ||
    !Array.isArray(recentlyViewedBusinesses) ||
    recentlyViewedBusinesses.length > MAX_RECENTLY_VIEWED ||
    !Array.isArray(preferredCategories) ||
    preferredCategories.length > MAX_PREFERRED_CATEGORIES ||
    !Array.isArray(preferredLocations) ||
    preferredLocations.length > MAX_PREFERRED_LOCATIONS
  ) {
    return null;
  }

  const searches: RecentSearch[] = [];
  for (const entry of recentSearches) {
    if (!isRecord(entry)) return null;
    const query = boundedString(entry.query, 150);
    const category = boundedString(entry.category, 80);
    const createdAt = validTimestamp(entry.createdAt);
    const location = parseLocation(entry.location);
    if (!query || !category || !createdAt || (entry.location !== null && !location)) return null;
    searches.push({ query, category, location, createdAt });
  }

  const views: RecentBusinessView[] = [];
  for (const entry of recentlyViewedBusinesses) {
    if (!isRecord(entry)) return null;
    const id = boundedString(entry.id, 128);
    const slug = boundedString(entry.slug, 150);
    const name = boundedString(entry.name, 200);
    const category = boundedString(entry.category, 80);
    const city = boundedString(entry.city, 80);
    const area = boundedString(entry.area, 80);
    const viewedAt = validTimestamp(entry.viewedAt);
    if (!id || !slug || !name || !category || !city || !area || !viewedAt) return null;
    views.push({ id, slug, name, category, city, area, viewedAt });
  }

  const categories: PreferredCategory[] = [];
  for (const entry of preferredCategories) {
    if (!isRecord(entry)) return null;
    const name = boundedString(entry.name, 80);
    const updatedAt = validTimestamp(entry.updatedAt);
    if (!name || !updatedAt) return null;
    categories.push({ name, updatedAt });
  }

  const locations: PreferredLocation[] = [];
  for (const entry of preferredLocations) {
    if (!isRecord(entry)) return null;
    const location = parseLocation(entry);
    const updatedAt = validTimestamp(entry.updatedAt);
    if (!location || !updatedAt) return null;
    locations.push({ ...location, updatedAt });
  }

  return {
    recentSearches: searches,
    recentlyViewedBusinesses: views,
    preferredCategories: categories,
    preferredLocations: locations,
  };
}

export function mergeDiscoveryPreferences(
  first: DiscoveryPreferences,
  second: DiscoveryPreferences,
): DiscoveryPreferences {
  const mergeByKey = <T>(
    firstEntries: T[],
    secondEntries: T[],
    keyOf: (entry: T) => string,
    dateOf: (entry: T) => string,
    limit: number,
  ) => {
    const unique = new Map<string, T>();
    for (const entry of [...firstEntries, ...secondEntries]) {
      const key = keyOf(entry);
      const existing = unique.get(key);
      if (!existing || Date.parse(dateOf(entry)) > Date.parse(dateOf(existing))) {
        unique.set(key, entry);
      }
    }
    return [...unique.values()]
      .sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a)))
      .slice(0, limit);
  };

  return {
    recentSearches: mergeByKey(
      first.recentSearches,
      second.recentSearches,
      (entry) => `${entry.query.toLowerCase()}|${entry.category.toLowerCase()}|${entry.location?.country.toLowerCase() ?? ""}|${entry.location?.city.toLowerCase() ?? ""}|${entry.location?.area.toLowerCase() ?? ""}`,
      (entry) => entry.createdAt,
      MAX_RECENT_SEARCHES,
    ),
    recentlyViewedBusinesses: mergeByKey(
      first.recentlyViewedBusinesses,
      second.recentlyViewedBusinesses,
      (entry) => entry.id,
      (entry) => entry.viewedAt,
      MAX_RECENTLY_VIEWED,
    ),
    preferredCategories: mergeByKey(
      first.preferredCategories,
      second.preferredCategories,
      (entry) => entry.name.toLowerCase(),
      (entry) => entry.updatedAt,
      MAX_PREFERRED_CATEGORIES,
    ),
    preferredLocations: mergeByKey(
      first.preferredLocations,
      second.preferredLocations,
      (entry) => `${entry.country.toLowerCase()}|${entry.city.toLowerCase()}|${entry.area.toLowerCase()}`,
      (entry) => entry.updatedAt,
      MAX_PREFERRED_LOCATIONS,
    ),
  };
}

export function recordSearch(
  preferences: DiscoveryPreferences,
  search: Omit<RecentSearch, "createdAt">,
  now = new Date(),
): DiscoveryPreferences {
  if (!search.query.trim()) return preferences;
  const updated: RecentSearch = { ...search, createdAt: now.toISOString() };
  return mergeDiscoveryPreferences(
    { ...preferences, recentSearches: [updated, ...preferences.recentSearches] },
    emptyDiscoveryPreferences(),
  );
}

function recordPreferredCategory(
  preferences: DiscoveryPreferences,
  category: string,
  now: Date,
): DiscoveryPreferences {
  if (!category || category === "All") return preferences;
  const updated: PreferredCategory = { name: category, updatedAt: now.toISOString() };
  return mergeDiscoveryPreferences(
    { ...preferences, preferredCategories: [updated, ...preferences.preferredCategories] },
    emptyDiscoveryPreferences(),
  );
}

export function recordBusinessView(
  preferences: DiscoveryPreferences,
  business: Omit<RecentBusinessView, "viewedAt">,
  now = new Date(),
): DiscoveryPreferences {
  const updated: RecentBusinessView = { ...business, viewedAt: now.toISOString() };
  return recordPreferredCategory(
    mergeDiscoveryPreferences(
      { ...preferences, recentlyViewedBusinesses: [updated, ...preferences.recentlyViewedBusinesses] },
      emptyDiscoveryPreferences(),
    ),
    business.category,
    now,
  );
}

export function recordCategoryPreference(
  preferences: DiscoveryPreferences,
  category: string,
  now = new Date(),
): DiscoveryPreferences {
  return recordPreferredCategory(preferences, category, now);
}

export function recordLocationPreference(
  preferences: DiscoveryPreferences,
  location: PreferenceLocation,
  now = new Date(),
): DiscoveryPreferences {
  if (!location.country.trim() || !location.city.trim()) return preferences;
  const updated: PreferredLocation = {
    country: location.country.trim(),
    city: location.city.trim(),
    area: location.area.trim(),
    updatedAt: now.toISOString(),
  };
  return mergeDiscoveryPreferences(
    { ...preferences, preferredLocations: [updated, ...preferences.preferredLocations] },
    emptyDiscoveryPreferences(),
  );
}
