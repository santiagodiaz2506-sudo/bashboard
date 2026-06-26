import { NextResponse } from "next/server";

const SHEET_VENTAS_CSV =
  "https://docs.google.com/spreadsheets/d/1QQc0gTupYIyKLDY5JXvnYtBdBfGh9wscl1qi63FMnGA/export?format=csv";
const SHEET_FIDELIZACION_CSV =
  "https://docs.google.com/spreadsheets/d/1kNwlB-PIQ69Df4LCDklDOykFLl9tgHQqOguTgvERHWA/export?format=csv";

function parseMoney(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$\s"]/g, "");
  const withoutCommas = cleaned.replace(/,/g, "");
  const num = parseFloat(withoutCommas);
  return isNaN(num) ? 0 : num;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(current.trim()); current = ""; }
      else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim()); current = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
        row = []; if (ch === "\r") i++;
      } else current += ch;
    }
  }
  if (current || row.length > 0) { row.push(current.trim()); rows.push(row); }
  return rows;
}

async function fetchSheet(url: string): Promise<string[][]> {
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return parseCSV(await res.text());
}

// Ventas column indices
const V = {
  fechaSol: 0, poliza: 1, placa: 2, estrategia: 3, aseguradora: 4,
  concesionario: 5, ccs: 6, comercial: 7, movimiento: 8,
  marca: 11, linea: 12, claseVeh: 13, tipoVeh: 14, modelo: 15,
  valorAsegurado: 18, primaNeta: 19,
  porcComision: 29, valorComision: 30, comisionCCS: 32, comisionAAA: 34,
  vigente: 37, mesEstrategia: 39, mes: 48,
  formaPago: 27, financiera: 28,
};

// Fidelización column indices
const F = {
  placa: 0, mes: 1, estrategia: 2, ccs: 3, linea: 4, marca: 5, modelo: 7,
  documento: 8, tipificacion: 9, informacion: 10, lineaDef: 11, tipoVeh: 12,
  aseguradoraDef: 13, valorAsegurado: 14, primaNeta: 15,
  pctComTotal: 16, comTotal: 17, pctComCCS: 18, comCCS: 19, pctComAAA: 20, comAAA: 21,
  cartera: 22, vigentes: 23, poliza: 24, segmento: 25,
  asesora: 26, experian: 27, canalContacto: 28,
  llamadasTotal: 29, llamadasLucia: 30, llamadasWecall: 31,
  whatsappTotal: 32, whatsappLucia: 33, whatsappAgente: 34,
  comisionIngresoAAA: 40, canalIngreso: 41,
  fechaEmision: 44, mesEmision: 45,
};

export async function GET() {
  try {
    const [ventasRaw, fidRaw] = await Promise.all([
      fetchSheet(SHEET_VENTAS_CSV),
      fetchSheet(SHEET_FIDELIZACION_CSV),
    ]);

    // Parse ventas rows
    const ventas = ventasRaw.slice(1).map((r) => {
      const g = (idx: number) => (r[idx] || "").trim();
      const m = (idx: number) => parseMoney(r[idx] || "");
      const fechaRaw = g(V.fechaSol);
      let fechaDate: Date | null = null;
      if (fechaRaw) {
        const p = fechaRaw.split("/");
        if (p.length === 3) fechaDate = new Date(p[2] + "-" + p[0] + "-" + p[1]);
        else fechaDate = new Date(fechaRaw);
      }
      const ano = fechaDate && !isNaN(fechaDate.getTime()) ? fechaDate.getFullYear() : null;
      return {
        fechaSolicitud: fechaRaw,
        fechaDate: fechaDate ? fechaDate.toISOString() : null,
        ano,
        poliza: g(V.poliza),
        placa: g(V.placa),
        estrategia: g(V.estrategia),
        aseguradora: g(V.aseguradora),
        concesionario: g(V.concesionario),
        comercial: g(V.comercial),
        movimiento: g(V.movimiento),
        marca: g(V.marca),
        linea: g(V.linea),
        claseVeh: g(V.claseVeh),
        tipoVeh: g(V.tipoVeh),
        modeloAno: g(V.modelo),
        valorAsegurado: m(V.valorAsegurado),
        primaNeta: m(V.primaNeta),
        porcComision: m(V.porcComision),
        valorComision: m(V.valorComision),
        comisionCCS: m(V.comisionCCS),
        comisionAAA: m(V.comisionAAA),
        vigente: g(V.vigente).toUpperCase() === "SI",
        mes: g(V.mes).toLowerCase(),
        mesEstrategia: g(V.mesEstrategia),
        formaPago: g(V.formaPago),
        financiera: g(V.financiera),
      };
    });

    // Parse fidelización rows
    const fidelizacion = fidRaw.slice(1).map((r) => {
      const g = (idx: number) => (r[idx] || "").trim();
      const m = (idx: number) => parseMoney(r[idx] || "");
      const n = (idx: number) => parseInt(r[idx] || "0") || 0;
      const fechaRaw = g(F.fechaEmision);
      let fechaDate: Date | null = null;
      if (fechaRaw) {
        const p = fechaRaw.split("/");
        if (p.length === 3) fechaDate = new Date(p[2] + "-" + p[0] + "-" + p[1]);
        else fechaDate = new Date(fechaRaw);
      }
      const ano = fechaDate && !isNaN(fechaDate.getTime()) ? fechaDate.getFullYear() : null;
      return {
        placa: g(F.placa),
        fechaEmision: fechaRaw,
        fechaDate: fechaDate ? fechaDate.toISOString() : null,
        ano,
        mes: g(F.mes),
        estrategia: g(F.estrategia),
        ccs: g(F.ccs),
        linea: g(F.linea),
        marca: g(F.marca),
        modeloAno: g(F.modelo),
        tipificacion: g(F.tipificacion),
        informacion: g(F.informacion),
        tipoVeh: g(F.tipoVeh),
        aseguradoraDef: g(F.aseguradoraDef),
        valorAsegurado: m(F.valorAsegurado),
        primaNeta: m(F.primaNeta),
        pctComTotal: m(F.pctComTotal),
        comTotal: m(F.comTotal),
        pctComCCS: m(F.pctComCCS),
        comCCS: m(F.comCCS),
        pctComAAA: m(F.pctComAAA),
        comAAA: m(F.comAAA),
        cartera: g(F.cartera),
        vigente: g(F.vigentes),
        poliza: g(F.poliza),
        segmento: g(F.segmento),
        asesora: g(F.asesora),
        experian: g(F.experian),
        canalContacto: g(F.canalContacto),
        llamadasTotal: n(F.llamadasTotal),
        llamadasLucia: n(F.llamadasLucia),
        llamadasWecall: n(F.llamadasWecall),
        whatsappTotal: n(F.whatsappTotal),
        whatsappLucia: n(F.whatsappLucia),
        whatsappAgente: n(F.whatsappAgente),
        comisionIngresoAAA: m(F.comisionIngresoAAA),
        canalIngreso: g(F.canalIngreso),
        fechaEmision: g(F.fechaEmision),
        mesEmision: g(F.mesEmision),
      };
    });

    // Extract filter options
    const mesesVentas = [...new Set(ventas.map((v) => v.mes).filter(Boolean))];
    const mesesFid = [...new Set(fidelizacion.map((f) => f.mes).filter(Boolean))];
    const anosVentas = [...new Set(ventas.map((v) => v.ano).filter((a): a is number => a !== null))].sort();
    const anosFid = [...new Set(fidelizacion.map((f) => f.ano).filter((a): a is number => a !== null))].sort();
    const estrategias = [...new Set(fidelizacion.map((f) => f.estrategia).filter(Boolean))];
    const asesoras = [...new Set(fidelizacion.map((f) => f.asesora).filter(Boolean))].sort();
    const segmentos = [...new Set(fidelizacion.map((f) => f.segmento).filter(Boolean))].sort();
    const comerciales = [...new Set(ventas.map((v) => v.comercial).filter(Boolean))].sort();

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      ventas,
      fidelizacion,
      filtros: {
        mesesVentas: mesesVentas.sort((a, b) => {
          const mo = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
          return mo.indexOf(a) - mo.indexOf(b);
        }),
        mesesFid: mesesFid.sort((a, b) => {
          const mo = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
          return mo.indexOf(a) - mo.indexOf(b);
        }),
        anosVentas,
        anosFid,
        estrategias,
        asesoras,
        segmentos,
        comerciales,
      },
    });
  } catch (error) {
    console.error("Error fetching sheets:", error);
    return NextResponse.json(
      { error: "Error al obtener datos", details: String(error) },
      { status: 500 }
    );
  }
}