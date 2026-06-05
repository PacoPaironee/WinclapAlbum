# Álbum del Mundial · Winclap

App web para completar el álbum del Mundial entre todos los de la oficina y
sortearlo al final, con probabilidad proporcional a los puntos de cada uno.

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth + RLS).
- **Acceso:** login con Google restringido a `@winclap.com`. Admin: `franco.pairone@winclap.com`.

## Correr local

```bash
npm install
cp .env.example .env.local   # completar con los valores de Supabase
npm run dev                  # http://localhost:3000
```

## Base de datos (Supabase)

Correr en el SQL Editor, en orden:

1. `supabase/schema.sql` (instalación nueva) — o las migraciones `migration_v2 … v7` si ya existía.
2. `supabase/seed_album_real.sql` — carga el catálogo real (994 figuritas).

Auth: habilitar **Google** en Authentication → Providers, y en **URL Configuration**
agregar la Site URL y los Redirect URLs (`http://localhost:3000/**` y el dominio de producción `/**`).

## Modelo de puntos

| Aporte | Puntos |
|---|---|
| Repe | 1 |
| Cambio | 2 |
| Nueva común | 3 |
| Nueva formación/escudo (1 y 13 de cada país) | 4 |
| Nueva especial (Coca / We Are Panini / FWC) | 5 |

El admin puede sumar/restar puntos a su criterio. Los ganadores de logros suman +50 al completar el álbum.

## Deploy (Netlify)

1. Subir el repo a GitHub.
2. En Netlify: *Import from Git* → seleccionar el repo.
3. Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. En Supabase → URL Configuration agregar el dominio de Netlify (Site URL + Redirect `/**`).
