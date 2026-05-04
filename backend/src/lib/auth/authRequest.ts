import { NextRequest } from "next/server";
import { verifyToken } from "./auth/jwt";

export function getAuth(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  return verifyToken(token); // { userId, role, exp }
}