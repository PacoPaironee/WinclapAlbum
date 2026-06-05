import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión y vuelve al login. Se usa desde el proxy (cuando el mail no
// es del dominio) y como fallback de logout.
async function signOutAndRedirect(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const reason = searchParams.get("reason");
  const supabase = await createClient();
  await supabase.auth.signOut();
  const qs = reason ? `?error=${reason}` : "";
  return NextResponse.redirect(`${origin}/login${qs}`);
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}
