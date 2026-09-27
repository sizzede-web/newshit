import { errorResponse, SocialError } from "@/lib/social/errors";
import { getMyFollowing, parsePlatform, platforms } from "@/lib/social";
import type { ListResult, ListType } from "@/types/social";

const DEFAULT_LIMIT = 1000;
const MAX_LIMIT = 10_000;

/** Lädt die Follower- oder Gefolgt-Liste eines fremden Accounts. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const platform = parsePlatform(params.get("platform"));
    const username = (params.get("username") ?? "").trim().replace(/^@/, "");
    if (!/^[\w.]{1,40}$/.test(username)) {
      throw new SocialError("Bitte einen gültigen Benutzernamen eingeben.", { status: 400 });
    }
    const type: ListType = params.get("type") === "followers" ? "followers" : "following";
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT),
    );

    const myFollowing = await getMyFollowing(platform);
    const { account, users } = await platforms[platform].getList(username, type, limit);
    const result: ListResult = {
      platform,
      account,
      type,
      users: users.map((u) => ({ ...u, iFollow: myFollowing.has(u.id) })),
    };
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
