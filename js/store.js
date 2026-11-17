import { buildSample } from "./sample.js";
const KEY = "ilq-leads-v1";

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("bad saved data, using sample", e);
  }
  return reset();
}
export function save(leads) {
  localStorage.setItem(KEY, JSON.stringify(leads));
}
export function reset() {
  const leads = buildSample();
  save(leads);
  return leads;
}
