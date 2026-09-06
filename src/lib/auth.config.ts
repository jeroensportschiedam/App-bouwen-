// De Edge-veilige helft van de auth-configuratie: geen Prisma, geen bcrypt.
// Middleware draait op de Edge Runtime, waar die twee niet werken — vandaar
// de knip. src/lib/auth.ts vult dit aan met de Credentials-provider en
// draait alleen in de gewone Node-omgeving (route handlers, server components).

import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [],
  callbacks: {
    // Puur data doorgeven tussen user/token/session — geen Prisma of bcrypt
    // nodig, dus dit mag (en moet) ook in de Edge-veilige config staan.
    // Anders ziet de middleware nooit de rol, en blokkeert die per ongeluk
    // ook de eigenaar bij Financiën.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname, origin } = request.nextUrl;

      if (!auth?.user) {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // CLAUDE.md §7: Financiën is alleen voor de eigenaar. Extra check op
      // de pagina zelf (financien/page.tsx) voor het geval dit pad hier ooit uitvalt.
      if (pathname.startsWith("/financien") && auth.user.role !== "OWNER") {
        return NextResponse.redirect(new URL("/dashboard", origin));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
