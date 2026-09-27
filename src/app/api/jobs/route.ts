import { errorResponse, SocialError } from "@/lib/social/errors";
import { cancelJob, getJob, listJobs, startJob } from "@/lib/social/jobs";
import { parsePlatform, parseUser } from "@/lib/social";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json(listJobs());
  const job = getJob(id);
  return job ? Response.json(job) : Response.json({ error: "Job nicht gefunden." }, { status: 404 });
}

/** Startet eine Automatik: allen übergebenen Usern nacheinander folgen/entfolgen. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: unknown;
      action?: unknown;
      users?: unknown;
      delayMs?: unknown;
    };
    const platform = parsePlatform(body.platform);
    if (body.action !== "follow" && body.action !== "unfollow") {
      throw new SocialError("Ungültige Aktion.", { status: 400 });
    }
    if (!Array.isArray(body.users)) throw new SocialError("Keine User übergeben.", { status: 400 });
    const users = body.users.map(parseUser);
    const delayMs = typeof body.delayMs === "number" ? body.delayMs : 5_000;
    return Response.json(startJob(platform, body.action, users, delayMs));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const job = cancelJob(id);
  return job ? Response.json(job) : Response.json({ error: "Job nicht gefunden." }, { status: 404 });
}
