import { timingSafeEqual } from "node:crypto";

type TokenPurpose = "agent_run" | "admin";

function getPresentedToken(request: Request) {
  const auth = request.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return (
    bearer ||
    request.headers.get("x-arcstream-server-token")?.trim() ||
    request.headers.get("x-arcstream-agent-token")?.trim() ||
    request.headers.get("x-arcstream-admin-token")?.trim() ||
    ""
  );
}

export function requireServerToken(
  request: Request,
  envName: "ARCSTREAM_AGENT_RUN_TOKEN" | "ARCSTREAM_ADMIN_TOKEN",
  purpose: TokenPurpose,
) {
  const expected = process.env[envName]?.trim();

  if (!expected) {
    return Response.json(
      { error: `${purpose}_token_not_configured`, env: envName },
      { status: 503 },
    );
  }

  const presented = getPresentedToken(request);
  const presentedBytes = Buffer.from(presented);
  const expectedBytes = Buffer.from(expected);
  const matches =
    presentedBytes.length === expectedBytes.length &&
    timingSafeEqual(presentedBytes, expectedBytes);
  if (!matches) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
