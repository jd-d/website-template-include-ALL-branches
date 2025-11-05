import { evaluateExpression, resolveStructuredValue } from './json-logic.js';

let cachedPacks = [];
let loadPromise = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener(cachedPacks);
  }
}

function decodeBase64(content) {
  const uncommented = content.replace(/^\s*#.*$/gm, '');
  const cleaned = uncommented.replace(/[^A-Za-z0-9+/=]/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToArrayBuffer(pem) {
  const cleaned = pem.replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  return decodeBase64(cleaned).buffer;
}

async function importPublicKey(pem) {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-PSS', hash: 'SHA-256' },
    true,
    ['verify']
  );
}

async function verifySignature(manifestText, signatureText, publicKeyPem) {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API not available for manifest verification.');
  }
  const key = await importPublicKey(publicKeyPem);
  const signatureBytes = decodeBase64(signatureText);
  const data = new TextEncoder().encode(manifestText);
  const verified = await crypto.subtle.verify(
    { name: 'RSA-PSS', saltLength: 32 },
    key,
    signatureBytes,
    data
  );
  if (!verified) {
    throw new Error('Rule manifest signature invalid.');
  }
}

async function computeChecksum(content) {
  const data = new TextEncoder().encode(content);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(buffer));
  return `sha256-${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function normalizePack(pack, entry) {
  const meta = pack.meta || {};
  const normalized = {
    ...pack,
    id: meta.id || entry.id,
    name: meta.name || entry.name,
    version: meta.version || entry.version,
    effectiveFrom: meta.effectiveFrom || pack.effectiveFrom || null,
    lastReviewed: meta.lastReviewed || pack.lastReviewed || null,
    complaint: pack.complaint,
    description: pack.description,
    inclusion: pack.inclusion || [],
    exclusion: pack.exclusion || [],
    safetyNetting: pack.safetyNetting || [],
    sections: pack.sections || [],
    intake: pack.intake || {},
    logic: pack.logic || {},
    source: { path: entry.path, checksum: entry.checksum }
  };
  return normalized;
}

async function loadManifest() {
  const [manifestResponse, signatureResponse, keyResponse] = await Promise.all([
    fetch('assets/rules/manifest.json'),
    fetch('assets/rules/manifest.sig.txt'),
    fetch('assets/rules/public_key.pem')
  ]);
  if (!manifestResponse.ok) {
    throw new Error(`Unable to load rule manifest (${manifestResponse.status}).`);
  }
  if (!signatureResponse.ok) {
    throw new Error(`Unable to load rule manifest signature (${signatureResponse.status}).`);
  }
  if (!keyResponse.ok) {
    throw new Error(`Unable to load rule manifest public key (${keyResponse.status}).`);
  }
  const [manifestText, signatureText, publicKeyPem] = await Promise.all([
    manifestResponse.text(),
    signatureResponse.text(),
    keyResponse.text()
  ]);
  await verifySignature(manifestText, signatureText, publicKeyPem);
  const manifest = JSON.parse(manifestText);
  return manifest;
}

async function fetchPack(entry) {
  const response = await fetch(entry.path);
  if (!response.ok) {
    throw new Error(`Unable to load rule pack ${entry.path} (${response.status}).`);
  }
  const text = await response.text();
  if (entry.checksum) {
    const checksum = await computeChecksum(text);
    if (checksum !== entry.checksum) {
      throw new Error(`Checksum mismatch for ${entry.path}. Expected ${entry.checksum}, got ${checksum}.`);
    }
  }
  const data = JSON.parse(text);
  return normalizePack(data, entry);
}

async function doLoadRulePacks() {
  const manifest = await loadManifest();
  const packs = [];
  for (const entry of manifest.packs || []) {
    const pack = await fetchPack(entry);
    packs.push(pack);
  }
  cachedPacks = packs;
  notify();
  return cachedPacks;
}

export function subscribeToRulePacks(listener) {
  listeners.add(listener);
  if (cachedPacks.length > 0) {
    listener(cachedPacks);
  }
  return () => listeners.delete(listener);
}

export async function loadRulePacks() {
  if (!loadPromise) {
    loadPromise = doLoadRulePacks().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  return loadPromise;
}

export function getRulePacks() {
  return cachedPacks;
}

export function getRulePackById(id) {
  return cachedPacks.find((pack) => pack.id === id) || null;
}

export function getComplaintOptions() {
  const complaints = new Map();
  for (const pack of cachedPacks) {
    if (pack?.complaint) {
      const existing = complaints.get(pack.complaint.id);
      if (!existing) {
        complaints.set(pack.complaint.id, {
          id: pack.complaint.id,
          label: pack.complaint.label,
          packs: []
        });
      }
      complaints.get(pack.complaint.id).packs.push({ id: pack.id, name: pack.name });
    }
  }
  return Array.from(complaints.values());
}

export function getRulePacksForComplaint(complaintId) {
  return cachedPacks.filter((pack) => pack.complaint?.id === complaintId);
}

export function evaluateDerivedValues(rulePack, context) {
  const derived = {};
  for (const item of rulePack.logic?.derived || []) {
    derived[item.id] = evaluateExpression(item.expression, context);
  }
  return derived;
}

export function renderValue(value, context) {
  return resolveStructuredValue(value, context);
}
