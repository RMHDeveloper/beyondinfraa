const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "project-files";

function objectUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
}

function authHeaders(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
    ...extra,
  };
}

export async function uploadObject(path: string, buffer: Buffer, mimeType: string) {
  const res = await fetch(objectUrl(path), {
    method: "POST",
    headers: authHeaders({ "Content-Type": mimeType, "x-upsert": "true" }),
    body: new Uint8Array(buffer),
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
}

export async function getObject(path: string): Promise<Buffer> {
  const res = await fetch(objectUrl(path), { headers: authHeaders() });
  if (!res.ok) throw new Error(`Storage download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function deleteObject(path: string) {
  await fetch(objectUrl(path), { method: "DELETE", headers: authHeaders() });
}
