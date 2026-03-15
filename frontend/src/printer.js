/**
 * Unified printer module.
 * Supports two modes stored in localStorage:
 *   "usb"     — WebUSB direct to Brother QL (requires WinUSB driver on Windows)
 *   "network" — local print_agent.py bridge → printer TCP:9100 (recommended)
 */

// ── Persistence ───────────────────────────────────────────────────────────────

export const AGENT_PORT = 9101;

export function getPrinterMode() {
  return localStorage.getItem("lf_printer_mode") || "usb";
}
export function getPrinterIp() {
  return localStorage.getItem("lf_printer_ip") || "";
}
export function setPrinterMode(mode) {
  localStorage.setItem("lf_printer_mode", mode);
}
export function setPrinterIp(ip) {
  localStorage.setItem("lf_printer_ip", ip.trim());
}

// ── Unified print entry point ─────────────────────────────────────────────────

export async function printBytes(bytes) {
  if (getPrinterMode() === "network") {
    await _networkSend(bytes);
  } else {
    await usbSendBytes(bytes);
  }
}

// ── Network / agent mode ──────────────────────────────────────────────────────

export async function checkAgentRunning() {
  const ip = getPrinterIp();
  if (!ip) return false;
  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket(`ws://localhost:${AGENT_PORT}/?ip=${encodeURIComponent(ip)}`);
    const timer = setTimeout(() => { settle(false); }, 2000);
    function settle(v) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      resolve(v);
    }
    ws.onopen  = () => settle(true);
    ws.onerror = () => settle(false);
  });
}

function _networkSend(bytes) {
  const ip = getPrinterIp();
  if (!ip) throw new Error("No printer IP set — add it in Settings → Printer");

  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(`ws://localhost:${AGENT_PORT}/?ip=${encodeURIComponent(ip)}`);
    ws.binaryType = "arraybuffer";

    const timer = setTimeout(() => {
      settle(null, new Error(
        "Print agent not responding.\nMake sure print_agent.py is running on this computer."
      ));
    }, 6000);

    function settle(ok, err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      err ? reject(err) : resolve(ok);
    }

    ws.onopen    = () => ws.send(bytes);
    ws.onmessage = (e) => {
      const msg = typeof e.data === "string" ? e.data : "ok";
      if (msg.startsWith("error:")) {
        settle(null, new Error(msg.slice(6)));
      } else {
        settle(true);
      }
    };
    ws.onerror = () => settle(null, new Error(
      "Cannot reach print agent.\nRun print_agent.py on this computer first."
    ));
  });
}

// ── USB / WebUSB mode ─────────────────────────────────────────────────────────

const VENDOR_ID = 0x04f9; // Brother
let _device = null;
const _listeners = new Set();

function _notifyUsb(connected) {
  _listeners.forEach((fn) => fn(connected));
}

export async function usbGetOrRequestDevice() {
  if (_device && _device.opened) return _device;

  let dev = null;
  try {
    const devices = await navigator.usb.getDevices();
    dev = devices.find((d) => d.vendorId === VENDOR_ID)
      || await navigator.usb.requestDevice({ filters: [{ vendorId: VENDOR_ID }] });

    if (!dev.opened) await dev.open();
    if (dev.configuration === null) await dev.selectConfiguration(1);
    await dev.claimInterface(0);

    _device = dev;
    _notifyUsb(true);
    return _device;
  } catch (err) {
    if (dev?.opened) try { await dev.close(); } catch {}
    _device = null;
    _notifyUsb(false);

    if (err.message?.includes("Unable to claim interface")) {
      const e = new Error(
        "Windows USB driver conflict.\n" +
        "Switch to Network mode in Settings (recommended),\n" +
        "or use Zadig to install the WinUSB driver."
      );
      e.name = "ClaimError";
      throw e;
    }
    throw err;
  }
}

export async function usbSendBytes(bytes) {
  const device = await usbGetOrRequestDevice();
  let endpointNum = 2;
  const iface = device.configuration?.interfaces?.[0];
  if (iface) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === "out" && ep.type === "bulk") endpointNum = ep.endpointNumber;
      }
    }
  }
  await device.transferOut(endpointNum, bytes);
}

export function useUsbConnected() {
  const [connected, setConnected] = React.useState(!!(_device?.opened));
  React.useEffect(() => {
    setConnected(!!(_device?.opened));
    _listeners.add(setConnected);
    return () => _listeners.delete(setConnected);
  }, []);
  return connected;
}

// Keep old names as aliases so Dashboard/Settings don't break during migration
export const getOrRequestDevice = usbGetOrRequestDevice;
export const sendBytesToPrinter = usbSendBytes;

import React from "react";
