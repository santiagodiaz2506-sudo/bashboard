import { NextResponse } from "next/server";

const SHEET_VENTAS_CSV =
  "https://docs.google.com/spreadsheets/d/1QQc0gTupYIyKLDY5JXvnYtBdBfGh9wscl1qi63FMnGA/export?format=csv";
const SHEET_FIDELIZACION_CSV =
  "https://docs.google.com/spreadsheets/d/1kNwlB-PIQ69Df4LCDklDOykFLl9tgHQqOguTgvERHWA/export?format=csv";

function parseMoney(val: string): number {
  if (!val) return 0;
  // Colombian format: " $  89,500,000 " or "57000000" or "207396.25"
  const cleaned = val.replace(/[$\s"]/g, "");
  // If it has commas as thousands separators (e.g., 89,500,000), remove them
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
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim());
        current = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          rows.push(row);
        }
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

async function fetchSheet(url: string): Promise<string[][]> {
  const res = await fetch(url, { cache: "no-store", next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

const MONTH_ORDER = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function monthSortKey(m: string): number {
  const idx = MONTH_ORDER.indexOf(m);
  return idx >= 0 ? idx : 999;
}

export async function GET() {
  try {
    const [ventasRaw, fidelizacionRaw] = await Promise.all([
      fetchSheet(SHEET_VENTAS_CSV),
      fetchSheet(SHEET_FIDELIZACION_CSV),
    ]);

    // ===== VENTAS =====
    const ventasHeader = ventasRaw[0] || [];
    const ventasRows = ventasRaw.slice(1);

    // Indices
    const iPoliza = 1, iPlaca = 2, iAseguradora = 4, iComercial = 7, iMovimiento = 8;
    const iMarca = 11, iLinea = 12, iModelo = 15, iValorAsegurado = 18, iPrimaNeta = 19;
    const iPorcComision = 29, iValorComision = 30, iComisionCCS = 32, iComisionAAA = 34;
    const iMesVigencia = 35, iVigente = 37, iMes = 48;
    const iConcesionario = 5;

    // KPIs
    let totalPolizas = 0;
    let totalPrima = 0;
    let totalComisionCCS = 0;
    let totalComisionAAA = 0;
    let totalValorAsegurado = 0;
    let vigentesCount = 0;
    const polizasPorMes: Record<string, { count: number; prima: number }> = {};
    const porAseguradora: Record<string, number> = {};
    const porComercial: Record<string, { count: number; prima: number }> = {};
    const porMarca: Record<string, number> = {};
    const porModelo: Record<string, { marca: string; count: number }> = {};
    const porConcesionario: Record<string, number> = {};
    const porMovimiento: Record<string, number> = {};

    for (const r of ventasRows) {
      const prima = parseMoney(r[iPrimaNeta] || "");
      const comCCS = parseMoney(r[iComisionCCS] || "");
      const comAAA = parseMoney(r[iComisionAAA] || "");
      const valorAseg = parseMoney(r[iValorAsegurado] || "");
      const vigente = (r[iVigente] || "").trim().toUpperCase() === "SI";
      const mes = (r[iMes] || "").trim().toLowerCase();
      const aseguradora = (r[iAseguradora] || "").trim();
      const comercial = (r[iComercial] || "").trim();
      const marca = (r[iMarca] || "").trim();
      const linea = (r[iLinea] || "").trim();
      const modelo = (r[iModelo] || "").trim();
      const concesionario = (r[iConcesionario] || "").trim();
      const movimiento = (r[iMovimiento] || "").trim();

      totalPolizas++;
      totalPrima += prima;
      totalComisionCCS += comCCS;
      totalComisionAAA += comAAA;
      totalValorAsegurado += valorAseg;
      if (vigente) vigentesCount++;

      if (mes) {
        if (!polizasPorMes[mes]) polizasPorMes[mes] = { count: 0, prima: 0 };
        polizasPorMes[mes].count++;
        polizasPorMes[mes].prima += prima;
      }
      if (aseguradora) porAseguradora[aseguradora] = (porAseguradora[aseguradora] || 0) + 1;
      if (comercial) {
        if (!porComercial[comercial]) porComercial[comercial] = { count: 0, prima: 0 };
        porComercial[comercial].count++;
        porComercial[comercial].prima += prima;
      }
      if (marca) porMarca[marca] = (porMarca[marca] || 0) + 1;
      if (linea) {
        const key = linea;
        if (!porModelo[key]) porModelo[key] = { marca, count: 0 };
        porModelo[key].count++;
      }
      if (concesionario) porConcesionario[concesionario] = (porConcesionario[concesionario] || 0) + 1;
      if (movimiento) porMovimiento[movimiento] = (porMovimiento[movimiento] || 0) + 1;
    }

    const polizasMesArray = Object.entries(polizasPorMes)
      .sort(([a], [b]) => monthSortKey(a) - monthSortKey(b))
      .map(([mes, data]) => ({ mes: mes.charAt(0).toUpperCase() + mes.slice(1), ...data }));

    const aseguradoraArray = Object.entries(porAseguradora)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const comercialArray = Object.entries(porComercial)
      .sort((a, b) => b[1].prima - a[1].prima)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    const marcaArray = Object.entries(porMarca)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    const lineaArray = Object.entries(porModelo)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([name, data]) => ({ name, marca: data.marca, value: data.count }));

    const concesionarioArray = Object.entries(porConcesionario)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // ===== FIDELIZACION =====
    const fidHeader = fidelizacionRaw[0] || [];
    const fidRows = fidelizacionRaw.slice(1);

    const fIMes = 1, fIEstrategia = 2, fITipificacion = 9, fIInformacion = 10;
    const fIAseguradoraDef = 13, fIPrima = 15, fIVigentes = 23, fISegemento = 25;
    const fIAsesora = 26, fIExperian = 27, fICanalContacto = 28;
    const fILlamadasTotal = 29, fIWhatsappTotal = 32;
    const fIComisionIngreso = 40, fICanalIngreso = 41;

    let fidTotal = 0;
    let fidVentas = 0;
    let fidNoAcepta = 0;
    let fidNoContactado = 0;
    let fidVolverLlamar = 0;
    let fidEnProceso = 0;
    const fidPorMes: Record<string, { total: number; ventas: number; prima: number }> = {};
    const fidPorTipificacion: Record<string, number> = {};
    const fidPorCanal: Record<string, number> = {};
    const fidPorEstrategia: Record<string, { total: number; ventas: number }> = {};
    const fidPorAsesora: Record<string, { total: number; ventas: number }> = {};
    let fidTotalLlamadas = 0;
    let fidTotalWhatsapp = 0;
    let fidPrimaTotal = 0;

    for (const r of fidRows) {
      fidTotal++;
      const tipi = (r[fITipificacion] || "").trim();
      const mes = (r[fIMes] || "").trim();
      const canal = (r[fICanalContacto] || "").trim();
      const estrategia = (r[fIEstrategia] || "").trim();
      const asesora = (r[fIAsesora] || "").trim();
      const llamadas = parseInt(r[fILlamadasTotal] || "0") || 0;
      const whatsapp = parseInt(r[fIWhatsappTotal] || "0") || 0;
      const prima = parseMoney(r[fIPrima] || "");
      const esVenta = tipi === "CONTACTO_CERRADO";

      fidTotalLlamadas += llamadas;
      fidTotalWhatsapp += whatsapp;

      if (esVenta) {
        fidVentas++;
        fidPrimaTotal += prima;
      } else if (tipi === "CONTACTO_NO_ACEPTA") fidNoAcepta++;
      else if (tipi === "NO_CONTACTADO") fidNoContactado++;
      else if (tipi.includes("VOLVER")) fidVolverLlamar++;
      else if (tipi === "CONTACTADO_EN_PROCESO") fidEnProceso++;

      if (tipi) fidPorTipificacion[tipi] = (fidPorTipificacion[tipi] || 0) + 1;
      if (canal) fidPorCanal[canal] = (fidPorCanal[canal] || 0) + 1;

      if (mes) {
        if (!fidPorMes[mes]) fidPorMes[mes] = { total: 0, ventas: 0, prima: 0 };
        fidPorMes[mes].total++;
        if (esVenta) {
          fidPorMes[mes].ventas++;
          fidPorMes[mes].prima += prima;
        }
      }

      if (estrategia) {
        if (!fidPorEstrategia[estrategia]) fidPorEstrategia[estrategia] = { total: 0, ventas: 0 };
        fidPorEstrategia[estrategia].total++;
        if (esVenta) fidPorEstrategia[estrategia].ventas++;
      }

      if (asesora) {
        if (!fidPorAsesora[asesora]) fidPorAsesora[asesora] = { total: 0, ventas: 0 };
        fidPorAsesora[asesora].total++;
        if (esVenta) fidPorAsesora[asesora].ventas++;
      }
    }

    const fidMesArray = Object.entries(fidPorMes)
      .sort(([a], [b]) => monthSortKey(a) - monthSortKey(b))
      .map(([mes, data]) => ({ mes, ...data }));

    const fidTipificacionArray = Object.entries(fidPorTipificacion)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const fidCanalArray = Object.entries(fidPorCanal)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const fidEstrategiaArray = Object.entries(fidPorEstrategia)
      .sort((a, b) => b[1].ventas - a[1].ventas)
      .map(([name, data]) => ({ name, ...data }));

    const fidAsesoraArray = Object.entries(fidPorAsesora)
      .sort((a, b) => b[1].ventas - a[1].ventas)
      .map(([name, data]) => ({ name, ...data }));

    return NextResponse.json({
      lastUpdated: new Date().toISOString(),
      ventas: {
        kpis: {
          totalPolizas,
          totalPrima,
          totalComisionCCS,
          totalComisionAAA,
          totalValorAsegurado,
          vigentesCount,
          pctVigentes: totalPolizas > 0 ? Math.round((vigentesCount / totalPolizas) * 100) : 0,
        },
        porMes: polizasMesArray,
        porAseguradora: aseguradoraArray,
        porComercial: comercialArray,
        porMarca: marcaArray,
        porLinea: lineaArray,
        porConcesionario: concesionarioArray,
        porMovimiento: porMovimiento,
      },
      fidelizacion: {
        kpis: {
          totalContactos: fidTotal,
          ventas: fidVentas,
          noAcepta: fidNoAcepta,
          noContactado: fidNoContactado,
          volverLlamar: fidVolverLlamar,
          enProceso: fidEnProceso,
          tasaConversion: fidTotal > 0 ? parseFloat(((fidVentas / fidTotal) * 100).toFixed(1)) : 0,
          totalLlamadas: fidTotalLlamadas,
          totalWhatsapp: fidTotalWhatsapp,
          primaFidelizacion: fidPrimaTotal,
        },
        porMes: fidMesArray,
        porTipificacion: fidTipificacionArray,
        porCanal: fidCanalArray,
        porEstrategia: fidEstrategiaArray,
        porAsesora: fidAsesoraArray,
      },
    });
  } catch (error) {
    console.error("Error fetching sheets:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de Google Sheets", details: String(error) },
      { status: 500 }
    );
  }
}