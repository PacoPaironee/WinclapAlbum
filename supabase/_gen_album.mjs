// Genera supabase/seed_album_real.sql con el catálogo real del álbum.
import { writeFileSync } from "node:fs";

const esc = (s) => s.replace(/'/g, "''");

// Secciones especiales (orden 1..3)
const specials = [
  { name: "We Are Panini", color: "#7C5CFF", codes: ["00"], coca: false, especial: true },
  { name: "FIFA World Cup History", color: "#FFD447", codes: range("FWC", 19), coca: false, especial: true },
  { name: "Coca-Cola Legends", color: "#E61A27", codes: range("CC", 14), coca: true, especial: true },
];

// Países en orden (prefijo, nombre, color de bandera visible sobre fondo oscuro)
const countries = [
  ["MEX", "México", "#1F9E5A"],
  ["RSA", "Sudáfrica", "#1AA64B"],
  ["KOR", "Corea del Sur", "#3A7DE0"],
  ["CZE", "Chequia", "#3B6FB6"],
  ["CAN", "Canadá", "#FF3B3B"],
  ["BIH", "Bosnia y Herzegovina", "#3D6BE0"],
  ["QAT", "Qatar", "#B23A66"],
  ["SUI", "Suiza", "#FF3B3B"],
  ["BRA", "Brasil", "#FFDC00"],
  ["MAR", "Marruecos", "#E0453F"],
  ["HAI", "Haití", "#3B5BD0"],
  ["SCO", "Escocia", "#4F9BE8"],
  ["USA", "Estados Unidos", "#3B6BD6"],
  ["PAR", "Paraguay", "#E0453F"],
  ["AUS", "Australia", "#2BAE66"],
  ["TUR", "Turquía", "#FF3B3B"],
  ["GER", "Alemania", "#FFCE00"],
  ["CUW", "Curazao", "#3B6BE0"],
  ["CIV", "Costa de Marfil", "#FF8A33"],
  ["ECU", "Ecuador", "#FFCE2E"],
  ["NED", "Países Bajos", "#FF7A1A"],
  ["JPN", "Japón", "#E63950"],
  ["SWE", "Suecia", "#FFD43B"],
  ["TUN", "Túnez", "#E63950"],
  ["BEL", "Bélgica", "#FFD43B"],
  ["EGY", "Egipto", "#E0453F"],
  ["IRN", "Irán", "#33B36B"],
  ["NZL", "Nueva Zelanda", "#4A7BD6"],
  ["ESP", "España", "#E0453F"],
  ["CPV", "Cabo Verde", "#3B6BD6"],
  ["KSA", "Arabia Saudita", "#1F9E5A"],
  ["URU", "Uruguay", "#5BC2E7"],
  ["FRA", "Francia", "#4A7BE0"],
  ["SEN", "Senegal", "#2BAE66"],
  ["IRQ", "Irak", "#E0453F"],
  ["NOR", "Noruega", "#E0455F"],
  ["ARG", "Argentina", "#6CACE4"],
  ["ALG", "Argelia", "#1F9E5A"],
  ["AUT", "Austria", "#FF4A5A"],
  ["JOR", "Jordania", "#2BAE66"],
  ["POR", "Portugal", "#2B8A4B"],
  ["COD", "Congo DR", "#4A9BE8"],
  ["UZB", "Uzbekistán", "#33B36B"],
  ["COL", "Colombia", "#FCD116"],
  ["ENG", "Inglaterra", "#E63950"],
  ["CRO", "Croacia", "#E0453F"],
  ["GHA", "Ghana", "#2BAE66"],
  ["PAN", "Panamá", "#4A7BD6"],
];

function range(prefix, n) {
  return Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);
}

// Construir lista de selecciones (orden) y sus figuritas
const selecciones = [];
let orden = 0;

for (const s of specials) {
  orden += 1;
  selecciones.push({
    nombre: s.name,
    color: s.color,
    orden,
    codes: s.codes,
    coca: s.coca,
    especial: s.especial,
  });
}
for (const [prefix, name, color] of countries) {
  orden += 1;
  selecciones.push({
    nombre: name,
    color,
    orden,
    codes: range(prefix, 20),
    coca: false,
    especial: false,
  });
}

// Generar SQL
let sql = `-- ============================================================================
-- SEED ÁLBUM REAL — Panini FIFA World Cup (catálogo enviado por el usuario)
-- 51 secciones (3 especiales + 48 países), 994 figuritas.
-- OJO: REEMPLAZA el álbum: borra figuritas/aportes/sorteos previos (datos de
-- prueba). NO toca los clappers (usuarios reales). Pegar en SQL Editor → Run.
-- ============================================================================

begin;

delete from sorteos;
delete from aportes;
delete from figuritas;
delete from selecciones;

`;

// Insert selecciones
sql += "insert into selecciones (nombre, grupo, orden, color) values\n";
sql += selecciones
  .map((s) => `  ('${esc(s.nombre)}', null, ${s.orden}, '${s.color}')`)
  .join(",\n");
sql += ";\n\n";

// Insert figuritas por selección
const total = selecciones.reduce((n, s) => n + s.codes.length, 0);
for (const s of selecciones) {
  const rows = s.codes
    .map((c) => {
      const num = parseInt((c.split(" ")[1] ?? ""), 10);
      // Formación/escudo: figurita 1 y 13 de cada país (no en secciones especiales)
      const formacion = !s.especial && (num === 1 || num === 13);
      return `  ('${esc(c)}', (select id from selecciones where nombre='${esc(
        s.nombre,
      )}'), ${s.coca}, ${s.especial}, ${formacion}, 'faltante', 0)`;
    })
    .join(",\n");
  sql += `-- ${s.nombre} (${s.codes.length})\n`;
  sql += `insert into figuritas (codigo, seleccion_id, es_coca, es_especial, es_formacion, estado, repetidas) values\n${rows};\n\n`;
}

sql += "commit;\n";
sql += `-- Total figuritas: ${total}\n`;

writeFileSync(new URL("./seed_album_real.sql", import.meta.url), sql);
console.log(`OK · ${selecciones.length} selecciones · ${total} figuritas`);
