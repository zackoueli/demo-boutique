import { NextRequest, NextResponse } from "next/server";

// Firebase Auth utilise localStorage (pas de cookie) — la vérification du rôle
// se fait côté client dans AdminLayout via useAuth()/isAdmin.
// Ce middleware ajoute des headers de sécurité sur les routes /admin/* et bloque
// les requêtes sans JavaScript (robots, scanners) qui ne peuvent pas hydrater le layout.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    // Empêche l'indexation des pages admin
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    // Empêche le chargement dans une iframe (clickjacking)
    res.headers.set("X-Frame-Options", "DENY");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
