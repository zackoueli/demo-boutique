import { NextRequest, NextResponse } from "next/server";

// Firebase Auth utilise localStorage (pas de cookie), donc la vérification
// du rôle admin ne peut pas se faire côté edge. Elle est gérée dans
// app/admin/layout.tsx via useAuth(). Ce middleware reste en place pour
// les futures améliorations (ex: session cookie avec Firebase Admin SDK).
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
