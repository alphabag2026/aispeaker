// Storage helpers with dual-mode support:
// 1. Manus Forge S3 proxy (when BUILT_IN_FORGE_API_URL points to Forge)
// 2. Local filesystem fallback (for self-hosted production)

import { ENV } from './_core/env';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { existsSync } from 'fs';

type StorageConfig = { baseUrl: string; apiKey: string };

/**
 * Check if we should use local filesystem storage
 * (when BUILT_IN_FORGE_API_URL is not set, empty, or points to non-Forge URL like Gemini)
 */
function useLocalStorage(): boolean {
  const url = ENV.forgeApiUrl;
  if (!url || url.trim().length === 0) return true;
  // If URL contains googleapis.com, it's Gemini, not Forge storage
  if (url.includes("googleapis.com")) return true;
  // If URL doesn't contain forge/storage patterns, assume local
  if (!url.includes("forge") && !url.includes("storage")) return true;
  return false;
}

// ==================== Forge S3 Storage ====================

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = key.split("/").filter(Boolean);

  if (parts.length === 0 || parts.some(part => part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }

  return parts.join("/");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ==================== Local Filesystem Storage ====================

const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || '/opt/aispeaker/storage';
const LOCAL_STORAGE_URL_PREFIX = '/storage';

async function localStoragePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const storageRoot = resolve(LOCAL_STORAGE_DIR);
  const filePath = resolve(join(storageRoot, key));

  if (filePath !== storageRoot && !filePath.startsWith(`${storageRoot}\\`) && !filePath.startsWith(`${storageRoot}/`)) {
    throw new Error("Invalid storage path");
  }

  const dir = dirname(filePath);

  // Ensure directory exists
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write file
  if (typeof data === "string") {
    await writeFile(filePath, data, "utf-8");
  } else {
    await writeFile(filePath, data);
  }

  // Return URL path that will be served by Express static middleware
  const url = `${LOCAL_STORAGE_URL_PREFIX}/${key}`;
  return { key, url };
}

async function localStorageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `${LOCAL_STORAGE_URL_PREFIX}/${key}`,
  };
}

// ==================== Public API ====================

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Use local storage for self-hosted production
  if (useLocalStorage()) {
    return localStoragePut(relKey, data, contentType);
  }

  // Use Forge S3 proxy
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  // Use local storage for self-hosted production
  if (useLocalStorage()) {
    return localStorageGet(relKey);
  }

  // Use Forge S3 proxy
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
