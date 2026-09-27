// Profilbilder von Instagram/TikTok lassen sich oft nicht direkt einbetten,
// daher holt der lokale Server sie ab. Nur bekannte CDN-Hosts sind erlaubt.
const ALLOWED_HOSTS = [/\.cdninstagram\.com$/, /\.fbcdn\.net$/, /\.tiktokcdn(-\w+)?\.com$/, /\.ibyteimg\.com$/, /\.byteimg\.com$/];

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Bad URL", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(target.hostname))) {
    return new Response("Host not allowed", { status: 400 });
  }
  const res = await fetch(target, { redirect: "error" }).catch(() => null);
  const contentType = res?.headers.get("content-type") ?? "";
  if (!res?.ok || !contentType.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(res.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=86400",
    },
  });
}
