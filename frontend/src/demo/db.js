import { buildSeed } from './seed';

// Bump when the seed shape changes so visitors get fresh data
const KEY = 'viducate-demo-v2';

let cache = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted or unavailable storage: fall back to a fresh seed
  }
  return buildSeed();
}

export function db() {
  if (!cache) cache = load();
  return cache;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // quota exceeded or storage blocked: keep working in memory
  }
}

export function resetDemo() {
  cache = buildSeed();
  save();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

let counter = 0;
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
