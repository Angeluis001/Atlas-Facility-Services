import { requireAdmin } from "../../lib/auth.js";
import { json, methodNotAllowed } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;
    return json(res, 200, { ok: true, user });
  } catch (err) {
    console.error("[auth/me]", err);
    return json(res, 500, { ok: false, error: "Error de sesión" });
  }
}
