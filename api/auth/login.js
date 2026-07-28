import { getSql } from "../../lib/db.js";
import {
  verifyPassword,
  createSessionToken,
  setSessionCookie,
} from "../../lib/auth.js";
import { json, readBody, sanitize, methodNotAllowed } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  try {
    const body = readBody(req);
    const email = sanitize(body.email, 200).toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return json(res, 400, { ok: false, error: "Email y contraseña requeridos" });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, email, name, role, password_hash
      FROM admin_users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
      return json(res, 401, { ok: false, error: "Credenciales incorrectas" });
    }

    const user = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
    };

    const token = createSessionToken(user);
    setSessionCookie(res, token);

    return json(res, 200, { ok: true, user });
  } catch (err) {
    console.error("[auth/login]", err);
    return json(res, 500, { ok: false, error: "Error de autenticación" });
  }
}
