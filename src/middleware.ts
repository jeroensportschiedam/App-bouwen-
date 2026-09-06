// Beschermt de ingelogde bedrijfsapp. Gebruikt bewust alleen de Edge-veilige
// auth.config.ts (geen Prisma/bcrypt) — zie dat bestand voor de redirectlogica.

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/klanten/:path*",
    "/financien/:path*",
    "/rooster/:path*",
    "/beschikbaarheid/:path*",
  ],
};
