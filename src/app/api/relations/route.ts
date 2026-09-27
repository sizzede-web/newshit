import { errorResponse } from "@/lib/social/errors";
import { parsePlatform, platforms, setMyFollowing } from "@/lib/social";
import type { RelationsResult } from "@/types/social";

/** Lädt die eigenen Follower + Gefolgt-Listen und berechnet, wer nicht zurückfolgt. */
export async function GET(request: Request) {
  try {
    const platform = parsePlatform(new URL(request.url).searchParams.get("platform"));
    const { me, followers, following } = await platforms[platform].getMyRelations();
    setMyFollowing(platform, following.map((u) => u.id));
    const followerIds = new Set(followers.map((u) => u.id));
    const result: RelationsResult = {
      platform,
      me,
      followers: followers.length,
      following: following.length,
      nonFollowers: following
        .filter((u) => !followerIds.has(u.id))
        .map((u) => ({ ...u, iFollow: true })),
    };
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
