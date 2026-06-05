import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail, isAdminEmail } from "@/lib/auth";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthFlow =
    pathname.startsWith("/login") || pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");

  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Sin sesión: solo se permite el flujo de login/OAuth; el resto rebota.
  if (!user) {
    if (isAuthFlow) return response;
    return redirect("/login");
  }

  // Con sesión pero mail fuera del dominio: cerrar sesión.
  if (!isAllowedEmail(user.email)) {
    if (pathname.startsWith("/auth/signout")) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signout";
    url.search = "?reason=domain";
    return NextResponse.redirect(url);
  }

  // Ya logueado: no tiene sentido ver /login.
  if (pathname.startsWith("/login")) return redirect("/");

  // Panel de admin: solo el admin.
  if (isAdminRoute && !isAdminEmail(user.email)) return redirect("/");

  return response;
}
