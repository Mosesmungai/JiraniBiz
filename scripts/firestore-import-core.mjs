function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return canonical(value.toDate());
  }
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function sameDocument(existing, incoming) {
  return JSON.stringify(canonical(existing)) === JSON.stringify(canonical(incoming));
}

export function classifyExistingDocuments(items, existingDocuments) {
  const itemsByKey = new Map(items.map((item) => [`${item.collection}/${item.id}`, item]));
  const existing = new Set();
  const conflicts = [];

  for (const document of existingDocuments) {
    const key = `${document.collection}/${document.id}`;
    const item = itemsByKey.get(key);
    if (item && sameDocument(document.data, item.data)) {
      existing.add(key);
    } else {
      conflicts.push(key);
    }
  }

  return { existing, conflicts };
}
