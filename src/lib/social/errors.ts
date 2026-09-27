export class SocialError extends Error {
  /** true, wenn die Plattform Aktionen vorübergehend gesperrt hat (Rate-Limit / Spam-Schutz) */
  readonly blocked: boolean;
  readonly status: number;

  constructor(message: string, options: { blocked?: boolean; status?: number } = {}) {
    super(message);
    this.name = "SocialError";
    this.blocked = options.blocked ?? false;
    this.status = options.status ?? 500;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof SocialError) {
    return Response.json(
      { error: error.message, blocked: error.blocked },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return Response.json({ error: message }, { status: 500 });
}
