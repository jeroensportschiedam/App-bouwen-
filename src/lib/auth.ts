// Inloggen voor de bedrijfsapp — CLAUDE.md §7/§14: eigen accounts voor
// trainers en de eigenaar, gekoppeld aan e-mailadres. Klanten loggen in een
// latere fase in via de trainingsapp; die flow staat hier nog niet.
//
// Dit bestand draait alleen in de Node-omgeving (nooit in middleware — zie
// auth.config.ts voor het Edge-veilige deel).

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mailadres", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        // De klantapp-login komt pas in een latere fase; dit inlogscherm is voor trainer/eigenaar.
        if (user.role === "MEMBER") return null;

        const klopt = await bcrypt.compare(password, user.passwordHash);
        if (!klopt) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
});
