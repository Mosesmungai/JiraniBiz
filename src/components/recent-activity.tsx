"use client";

import { useEffect, useState } from "react";

const SEARCH_COOKIE = "jiranibiz_recent_searches";
const VIEWED_COOKIE = "jiranibiz_recent_views";
const MAX_ITEMS = 10;

function readCookie(name: string): string[] {
  if (typeof document === "undefined") return [];
  const item = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!item) return [];
  try { return JSON.parse(decodeURIComponent(item.slice(name.length + 1))); } catch { return []; }
}

function writeCookie(name: string, values: string[]) {
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(values.slice(0, MAX_ITEMS)))}; Max-Age=2592000; Path=/; SameSite=Lax`;
}

export function rememberSearch(value: string) {
  if (typeof document === "undefined") return;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return;
  writeCookie(SEARCH_COOKIE, [normalized, ...readCookie(SEARCH_COOKIE).filter(v => v.toLowerCase() !== normalized.toLowerCase())]);
}

export function rememberViewedBusiness(slug: string) {
  if (typeof document === "undefined" || !slug) return;
  writeCookie(VIEWED_COOKIE, [slug, ...readCookie(VIEWED_COOKIE).filter(v => v !== slug)]);
}

export function RecentSearches({ onSelect }: { onSelect: (value: string) => void }) {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setItems(readCookie(SEARCH_COOKIE));
    });
    return () => {
      active = false;
    };
  }, []);
  if (!items.length) return null;
  return <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Recent</span>{items.map(item => <button key={item} type="button" onClick={() => onSelect(item)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400">{item}</button>)}</div>;
}
