const STORAGE_URL = process.env.HOSTINGER_STORAGE_URL!; // e.g. https://yourdomain.com/property-management-app/storage.php
const STORAGE_KEY = process.env.HOSTINGER_STORAGE_KEY!;
const APP_ORIGIN = process.env.VERCEL ? "https://beyondinfraa-k9zk.vercel.app" : "http://localhost:3000";

function authHeaders(extra?: Record<string, string>) {
  return { "X-Api-Key": STORAGE_KEY, "X-App-Origin": APP_ORIGIN, ...extra };
}

export async function uploadObject(path: string, buffer: Buffer, mimeType: string) {
  const fd = new FormData();
  fd.append("path", path);
  fd.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), path.split("/").pop());

  const res = await fetch(`${STORAGE_URL}?action=upload`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
}

export async function getObject(path: string): Promise<Buffer> {
  const res = await fetch(`${STORAGE_URL}?action=get&path=${encodeURIComponent(path)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Storage download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteObject(path: string) {
  const fd = new FormData();
  fd.append("path", path);
  await fetch(`${STORAGE_URL}?action=delete`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
}
