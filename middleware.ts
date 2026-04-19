import { NextRequest, NextResponse } from "next/server";

// Protège /admin côté serveur : redirige vers /connexion si pas de session Firebase.
// La vérification du rôle "admin" est faite côté client dans app/admin/layout.tsx.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Firebase Auth stocke le token dans un cookie "__session" ou "firebase-*"
    // On vérifie la présence d'un cookie de session (heuristique rapide côté edge)
    const hasSession =
      request.cookies.has("__session") ||
      [...request.cookies.getAll()].some((c) => c.name.startsWith("firebase:"));

    if (!hasSession) {
      const loginUrl = new URL("/connexion", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
