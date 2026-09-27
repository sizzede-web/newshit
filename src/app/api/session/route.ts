import { openLogin } from "@/lib/social/browser";
import { errorResponse } from "@/lib/social/errors";
import { parsePlatform, platforms } from "@/lib/social";

export async function GET(request: Request) {
  try {
    const platform = parsePlatform(new URL(request.url).searchParams.get("platform"));
    return Response.json(await platforms[platform].getSession());
  } catch (error) {
    return errorResponse(error);
  }
}

/** Öffnet die Login-Seite im gesteuerten Browserfenster. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { platform?: unknown };
    const platform = parsePlatform(body.platform);
    await openLogin(platform);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
