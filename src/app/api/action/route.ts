import { errorResponse } from "@/lib/social/errors";
import { markFollowed, parsePlatform, parseUser, platforms } from "@/lib/social";

/** Einzelne manuelle Aktion: einem User folgen oder entfolgen. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { platform?: unknown; action?: unknown; user?: unknown };
    const platform = parsePlatform(body.platform);
    const user = parseUser(body.user);
    const service = platforms[platform];
    const isFollow = body.action === "follow";
    const outcome = isFollow ? await service.follow(user) : await service.unfollow(user);
    markFollowed(platform, user.id, isFollow);
    return Response.json({ outcome });
  } catch (error) {
    return errorResponse(error);
  }
}
