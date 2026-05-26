import { writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve, relative, isAbsolute } from "path";
import { existsSync } from "fs";

const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || "./storage";
const LOCAL_STORAGE_URL_PREFIX = "/storage";

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = key.split("/").filter(Boolean);

  if (parts.length === 0 || parts.some(part => part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }

  return parts.join("/");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const storageRoot = resolve(LOCAL_STORAGE_DIR);
  const filePath = resolve(join(storageRoot, key));
  const relativePath = relative(storageRoot, filePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Invalid storage path");
  }

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  if (typeof data === "string") {
    await writeFile(filePath, data, "utf-8");
  } else {
    await writeFile(filePath, data);
  }

  return { key, url: `${LOCAL_STORAGE_URL_PREFIX}/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${LOCAL_STORAGE_URL_PREFIX}/${key}` };
}
