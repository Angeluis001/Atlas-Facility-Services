export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  if (req.body == null || req.body === "") return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function sanitize(value, max = 500) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

export function methodNotAllowed(res, allow = "GET") {
  res.setHeader("Allow", allow);
  return json(res, 405, { ok: false, error: "Método no permitido" });
}
