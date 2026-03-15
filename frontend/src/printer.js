/**
 * Printer module — all calls go through the Canopy server,
 * which relays to the print agent running on the local Windows PC.
 */

import { api } from "./api.js";

export function getSelectedPrinter() {
  return localStorage.getItem("lf_printer_name") || "";
}
export function setSelectedPrinter(name) {
  localStorage.setItem("lf_printer_name", name);
}

/** Check whether any print agent is connected to the server. */
export async function checkAgentRunning() {
  try {
    const res = await api.agentStatus();
    const agents = res.agents || [];
    return agents.some((a) => a.connected === true);
  } catch {
    return false;
  }
}

/** Fetch the list of installed printers from the agent via the server. */
export async function listPrinters(agentId) {
  const res = await api.listPrinters(agentId);
  return res.printers || [];
}

/**
 * Send raster bytes to the printer via the server → agent → USB.
 * @param {Uint8Array} bytes  - raster data from /api/print/render
 * @param {string} [printerName] - Windows printer name; falls back to saved preference
 * @param {string} [agentId] - specific agent to use; falls back to org default
 */
export async function printBytes(bytes, printerName, agentId) {
  const name = printerName || getSelectedPrinter();
  if (!name) throw new Error("No printer selected — choose one in Agents settings");

  const token = localStorage.getItem("lf_token");
  const headers = {
    "Content-Type": "application/octet-stream",
    "X-Printer-Name": name,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(agentId ? { "X-Agent-Id": agentId } : {}),
  };

  const res = await fetch("/api/print/dispatch", {
    method: "POST",
    headers,
    body: bytes,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Print failed (HTTP ${res.status})`);
  }
}

// Keep old export name so Dashboard doesn't break
export const sendBytesToPrinter = (bytes) => printBytes(bytes);
