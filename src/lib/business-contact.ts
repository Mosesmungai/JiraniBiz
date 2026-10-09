export function normalizeWhatsAppNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = `+${trimmed.replace(/[^\d]/g, "")}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function whatsappLinkFromNumber(value: string) {
  const number = normalizeWhatsAppNumber(value);
  return number ? `https://wa.me/${number.slice(1)}` : "";
}

export function whatsappNumberFromLink(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "wa.me") return "";
    const number = normalizeWhatsAppNumber(url.pathname.slice(1));
    return number ?? "";
  } catch {
    return "";
  }
}

export function safeSocialLink(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeWhatsAppLink(value: string | undefined) {
  const safeLink = safeSocialLink(value);
  if (!safeLink) return null;
  const url = new URL(safeLink);
  return url.hostname === "wa.me" && /^\d{8,15}$/.test(url.pathname.slice(1))
    ? safeLink
    : null;
}
