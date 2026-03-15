/**
 * Printer module — all calls go through the LabelFlow server,
 * which relays to the print agent running on the local Windows PC.
 */

import { api } from "./api.js";

export function getSelectedPrinter() {
  return localStorage.getItem("lf_printer_name") || "";
}
export function setSelectedPrinter(name) {
  localStorage.setItem("lf_printer_name", name);
}

/** Check whether the print agent is connected to the server. */
export async function checkAgentRunning() {
  try {
    const res = await api.get("/api/agent/status");
    return res.connected === true;
  } catch {
    return false;
  }
}

/** Fetch the list of installed printers from the agent via the server. */
export async function listPrinters() {
  const res = await api.get("/api/printers");
  return res.printers || [];
}

/**
 * Send raster bytes to the printer via the server → agent → USB.
 * @param {Uint8Array} bytes  - raster data from /api/print/render
 * @param {string} [printerName] - Windows printer name; falls back to saved preference
 */
export async function printBytes(bytes, printerName) {
  const name = printerName || getSelectedPrinter();
  if (!name) throw new Error("No printer selected — choose one in Settings → Printer");

  const token = localStorage.getItem("lf_token");
  const res = await fetch("/api/print/dispatch", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Printer-Name": name,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: bytes,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Print failed (HTTP ${res.status})`);
  }
}

// Keep old export name so Dashboard doesn't break
export const sendBytesToPrinter = (bytes) => printBytes(bytes);
