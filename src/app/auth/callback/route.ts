import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";

// Callback de Google OAuth: intercambia el code por sesión y verifica que el
// mail sea del dominio de Winclap. Las cookies se setean DIRECTO sobre la
// respuesta de redirect para que la sesión quede en la primera vuelta
// (si no, en producción a veces pide loguear dos veces).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Respuesta de éxito (a /). Le atamos las cookies; si el dominio no sirve,
  // cambiamos el destino pero conservamos las cookies (de cierre de sesión).
  const okUrl = `${origin}${next.startsWith("/") ? next : "/"}`;
  const response = NextResponse.redirect(okUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedEmail(user?.email)) {
    await supabase.auth.signOut(); // setea cookies de cierre sobre `response`
    response.headers.set("Location", `${origin}/login?error=domain`);
    return response;
  }

  return response;
}
