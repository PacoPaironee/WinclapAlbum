"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { crearAportes, type FormState } from "@/lib/actions";
import { calcularPuntos } from "@/lib/points";
import type { TipoAporte } from "@/lib/types";
import type { FiguritaConSeleccion } from "@/lib/data";

type CartItem = {
  figurita_id: string;
  codigo: string;
  nombre: string | null;
  seleccion: string | null;
  color: string | null;
  es_coca: boolean;
  es_especial: boolean;
  es_formacion: boolean;
  estado: string;
  tipo: TipoAporte;
  cambio_figurita_id: string;
  cambio_label: string;
  comentario: string;
};

const fieldClass =
  "w-full px-4 py-3 rounded-lg border border-border bg-card-2 text-base focus:border-green focus:ring-2 focus:ring-green-bg outline-none";

export default function FormAporte({
  figuritas,
  userNombre,
}: {
  figuritas: FiguritaConSeleccion[];
  userNombre: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    crearAportes,
    {},
  );
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  // Puntos estimados por ítem (el total real lo fija el admin al validar)
  const estimar = (it: CartItem) =>
    calcularPuntos(it.tipo, {
      especial: it.es_especial,
      formacion: it.es_formacion,
    });
  const totalEstimado = useMemo(
    () => cart.reduce((s, it) => s + estimar(it), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart],
  );

  const inCart = useMemo(() => new Set(cart.map((c) => c.figurita_id)), [cart]);

  // Repes disponibles de Winclap (las que no están todas reservadas)
  const repesDisponibles = useMemo(
    () =>
      figuritas
        .filter((f) => f.repetidas - f.repetidas_reservadas > 0)
        .map((f) => ({
          id: f.id,
          label: `${f.codigo} · ${f.selecciones?.nombre ?? "—"}${
            f.nombre ? ` · ${f.nombre}` : ""
          }`,
          sub: `${f.repetidas - f.repetidas_reservadas} disponible(s)`,
        })),
    [figuritas],
  );

  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = figuritas.filter((f) => !inCart.has(f.id));
    const filtered = q
      ? base.filter((f) =>
          `${f.codigo} ${f.nombre ?? ""} ${f.selecciones?.nombre ?? ""}`
            .toLowerCase()
            .includes(q),
        )
      : base;
    return filtered.slice(0, q ? 50 : 60);
  }, [query, figuritas, inCart]);

  function add(f: FiguritaConSeleccion) {
    if (f.estado === "faltante" && f.reservada) return; // suspendida
    setCart((c) => [
      ...c,
      {
        figurita_id: f.id,
        codigo: f.codigo,
        nombre: f.nombre,
        seleccion: f.selecciones?.nombre ?? null,
        color: f.selecciones?.color ?? null,
        es_coca: f.es_coca,
        es_especial: f.es_especial,
        es_formacion: f.es_formacion,
        estado: f.estado,
        tipo: f.estado === "pegada" ? "repe" : "nueva",
        cambio_figurita_id: "",
        cambio_label: "",
        comentario: "",
      },
    ]);
  }
  const remove = (id: string) =>
    setCart((c) => c.filter((i) => i.figurita_id !== id));
  const patch = (id: string, p: Partial<CartItem>) =>
    setCart((c) => c.map((i) => (i.figurita_id === id ? { ...i, ...p } : i)));

  const cambiosSinRepe = cart.some(
    (c) => c.tipo === "cambio" && !c.cambio_figurita_id,
  );

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-green bg-green-bg p-6 text-center">
        <p className="font-display text-xl font-bold mb-1">¡Gracias! 🙌</p>
        <p className="text-sm text-muted">{state.message}</p>
        <a
          href="/aportar"
          className="inline-block mt-4 px-5 py-2 rounded-full bg-green text-black font-bold text-sm"
        >
          Cargar más
        </a>
      </div>
    );
  }

  const payload = JSON.stringify(
    cart.map((c) => ({
      figurita_id: c.figurita_id,
      tipo: c.tipo,
      cambio_figurita_id: c.tipo === "cambio" ? c.cambio_figurita_id : undefined,
      comentario: c.comentario,
    })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="items" value={payload} />

      {/* Quién aporta (usuario logueado) */}
      <div className="rounded-xl border border-border bg-card-2 px-4 py-3 text-sm">
        Aportás como{" "}
        <b className="text-green">{userNombre}</b>. Tus aportes quedan a tu
        nombre automáticamente.
      </div>

      {/* Buscador / desplegable de figuritas */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Buscá y agregá figuritas
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá por equipo, número o código…"
          className={fieldClass}
        />
        <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">Sin resultados.</p>
          ) : (
            resultados.map((f) => {
              const suspendida = f.estado === "faltante" && f.reservada;
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => add(f)}
                  disabled={suspendida}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-green-bg transition disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <span className="font-mono text-xs font-bold text-muted w-16 shrink-0">
                    {f.codigo}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="text-sm font-semibold block truncate"
                      style={{ color: f.selecciones?.color ?? undefined }}
                    >
                      {f.selecciones?.nombre ?? "—"}
                    </span>
                    {f.nombre && (
                      <span className="text-xs text-muted block truncate">
                        {f.nombre}
                      </span>
                    )}
                  </span>
                  {f.es_especial ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange text-white shrink-0">
                      Especial · 5
                    </span>
                  ) : f.es_formacion ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow/20 text-yellow shrink-0">
                      Formación · 4
                    </span>
                  ) : null}
                  {f.estado === "pegada" ? (
                    <span className="text-[10px] font-bold text-green shrink-0">
                      pegada · repe
                    </span>
                  ) : suspendida ? (
                    <span className="text-[10px] font-bold text-purple shrink-0">
                      reservada
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted shrink-0">
                      falta
                    </span>
                  )}
                  {!suspendida && (
                    <span className="text-green font-bold text-lg shrink-0">
                      +
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Carrito */}
      <div>
        <span className="text-sm font-semibold">
          Tus figuritas <span className="text-muted">({cart.length})</span>
        </span>
        {cart.length === 0 ? (
          <p className="mt-2 text-sm text-muted rounded-lg border border-dashed border-border px-3 py-4 text-center">
            Todavía no agregaste ninguna. Usá el buscador de arriba.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {cart.map((it) => (
              <CartRow
                key={it.figurita_id}
                item={it}
                repes={repesDisponibles}
                onPatch={(p) => patch(it.figurita_id, p)}
                onRemove={() => remove(it.figurita_id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Nota puntos */}
      <div className="rounded-xl bg-purple-bg p-3 text-xs text-muted">
        Puntos: <b>repe +1</b> · <b>cambio +2</b> · <b>nueva +3</b>. Las{" "}
        <b className="text-yellow">formaciones y escudos</b> (1 y 13 de cada país)
        suman <b>+4</b>, y las <b className="text-orange">especiales</b> (Coca, We
        Are Panini, FWC) <b>+5</b> si las traés sin cambio. El admin puede sumar{" "}
        <b className="text-purple">puntos extra</b> a su criterio: si creés que
        merecés más, contanos por qué en el comentario.
      </div>

      {state.error && (
        <div className="text-sm text-white bg-orange rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
      {cambiosSinRepe && (
        <div className="text-sm text-orange">
          En los cambios, elegí por qué repe de Winclap los cambiás.
        </div>
      )}
      {/* Paso 2: resumen / confirmación antes de enviar */}
      {confirmando ? (
        <div className="rounded-xl border border-green bg-green-bg/40 p-4 space-y-3">
          <p className="font-display text-lg font-bold">Revisá antes de enviar</p>
          <p className="text-xs text-muted">
            Aportás como <b className="text-foreground">{userNombre}</b>. Los
            puntos son <b>estimados</b>; el admin los confirma (y puede sumar
            extra).
          </p>
          <ul className="space-y-1.5">
            {cart.map((it) => (
              <li
                key={it.figurita_id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="font-mono text-xs text-muted w-12 shrink-0">
                  {it.codigo}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {it.seleccion ?? "—"}
                  <span className="text-muted">
                    {" · "}
                    {it.tipo}
                    {it.tipo === "cambio" && it.cambio_label
                      ? ` ↔ ${it.cambio_label.split(" · ")[0]}`
                      : ""}
                  </span>
                </span>
                {it.es_especial ? (
                  <span className="text-[10px] font-bold text-orange shrink-0">
                    especial
                  </span>
                ) : it.es_formacion ? (
                  <span className="text-[10px] font-bold text-yellow shrink-0">
                    formación
                  </span>
                ) : null}
                <span className="font-display font-bold text-green shrink-0">
                  +{estimar(it)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold">Total estimado</span>
            <span className="font-display text-xl font-bold text-green">
              ~{totalEstimado}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex-1 border border-border rounded-lg py-3 text-sm font-semibold hover:bg-card-2"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-[2] bg-green hover:opacity-90 disabled:opacity-40 text-black font-bold py-3 rounded-lg transition"
            >
              {pending ? "Cargando…" : "Confirmar y enviar"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={cart.length === 0 || cambiosSinRepe || pending}
          className="w-full bg-green hover:opacity-90 disabled:opacity-40 text-black font-bold py-3.5 rounded-lg transition"
        >
          {cart.length === 0
            ? "Agregá al menos una"
            : `Revisar ${cart.length} ${cart.length === 1 ? "aporte" : "aportes"}`}
        </button>
      )}
      <p className="text-center text-xs text-muted">
        Quedan <b>pendientes</b> hasta que el admin las valide.
      </p>
    </form>
  );
}

// ── Fila del carrito ────────────────────────────────────────────────────────
function CartRow({
  item,
  repes,
  onPatch,
  onRemove,
}: {
  item: CartItem;
  repes: { id: string; label: string; sub?: string }[];
  onPatch: (p: Partial<CartItem>) => void;
  onRemove: () => void;
}) {
  const pegada = item.estado === "pegada";

  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs font-bold text-muted w-14 shrink-0">
          {item.codigo}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className="text-sm font-semibold block truncate"
            style={{ color: item.color ?? undefined }}
          >
            {item.seleccion ?? "—"}
          </span>
          {item.nombre && (
            <span className="text-xs text-muted block truncate">
              {item.nombre}
            </span>
          )}
        </span>
        {item.es_especial ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange text-white shrink-0">
            Especial · 5
          </span>
        ) : item.es_formacion ? (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow/20 text-yellow shrink-0">
            Formación · 4
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-orange text-lg leading-none px-1 shrink-0"
          aria-label="Quitar"
        >
          ×
        </button>
      </div>

      {/* Tipo */}
      {pegada ? (
        <div className="mt-2 text-xs font-bold text-green bg-green-bg rounded-lg px-3 py-2">
          Repe · ya está pegada, suma al mazo de Winclap · +1
        </div>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <TipoBtn
            active={item.tipo === "nueva"}
            onClick={() => onPatch({ tipo: "nueva" })}
            label="Nueva"
            pts={
              item.es_especial ? "+5" : item.es_formacion ? "+4" : "+3"
            }
          />
          <TipoBtn
            active={item.tipo === "cambio"}
            onClick={() => onPatch({ tipo: "cambio" })}
            label="Cambio"
            pts="+2"
          />
        </div>
      )}

      {/* Cambio: elegir repe de Winclap */}
      {item.tipo === "cambio" && (
        <div className="mt-2 rounded-lg bg-blue-bg p-2.5">
          <p className="text-[11px] font-semibold text-muted mb-1.5">
            ¿Por qué repe de Winclap la cambiás?
          </p>
          {repes.length === 0 ? (
            <p className="text-xs text-orange">
              Ahora no hay repes disponibles en el mazo.
            </p>
          ) : (
            <Combobox
              options={repes}
              value={item.cambio_figurita_id}
              onChange={(id, label) =>
                onPatch({ cambio_figurita_id: id, cambio_label: label })
              }
              placeholder="Buscá la repe por equipo, número o código…"
              emptyText="Sin coincidencias."
              dark
            />
          )}
        </div>
      )}

      {/* Comentario */}
      <input
        value={item.comentario}
        onChange={(e) => onPatch({ comentario: e.target.value })}
        placeholder="Comentario (opcional): ¿por qué merece puntos extra?"
        className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-card-2 text-sm outline-none focus:border-green"
      />
    </li>
  );
}

function TipoBtn({
  active,
  onClick,
  label,
  pts,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  pts: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition ${
        active
          ? "border-green bg-green-bg text-green"
          : "border-border text-muted hover:border-green"
      }`}
    >
      {label}
      <span className="block text-[10px] font-semibold opacity-70">{pts}</span>
    </button>
  );
}

// ── Combobox reutilizable (desplegable + búsqueda) ──────────────────────────
function Combobox({
  options,
  value,
  onChange,
  placeholder,
  emptyText = "Sin resultados.",
  dark = false,
}: {
  options: { id: string; label: string; sub?: string }[];
  value: string;
  onChange: (id: string, label: string) => void;
  placeholder: string;
  emptyText?: string;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = options.find((o) => o.id === value);
  const text = open ? query : selected?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return list.slice(0, 50);
  }, [query, options]);

  return (
    <div className="relative">
      <input
        value={text}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        className={`w-full px-4 py-3 rounded-lg border border-border ${
          dark ? "bg-card" : "bg-card-2"
        } text-base focus:border-green focus:ring-2 focus:ring-green-bg outline-none`}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-xl divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                type="button"
                key={o.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.id, o.label);
                  setOpen(false);
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-green-bg transition ${
                  o.id === value ? "bg-green-bg" : ""
                }`}
              >
                <span className="text-sm font-semibold block truncate">
                  {o.label}
                </span>
                {o.sub && (
                  <span className="text-xs text-muted block">{o.sub}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
