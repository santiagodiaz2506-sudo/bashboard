"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  Shield, TrendingUp, Users, DollarSign, Phone, RefreshCw, Clock,
  Target, Car, UserCheck, BarChart3, ArrowDownRight, Activity, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ========== RAW TYPES ==========
interface Venta {
  poliza: string; placa: string; estrategia: string; aseguradora: string;
  concesionario: string; comercial: string; movimiento: string;
  marca: string; linea: string; claseVeh: string; tipoVeh: string;
  modeloAno: string; valorAsegurado: number; primaNeta: number;
  porcComision: number; valorComision: number; comisionCCS: number; comisionAAA: number;
  vigente: boolean; mes: string; mesEstrategia: string;
  formaPago: string; financiera: string; fechaSolicitud: string;
}

interface FidRow {
  placa: string; mes: string; estrategia: string; ccs: string;
  linea: string; marca: string; modeloAno: string;
  tipificacion: string; informacion: string; tipoVeh: string;
  aseguradoraDef: string; valorAsegurado: number; primaNeta: number;
  pctComTotal: number; comTotal: number; pctComCCS: number; comCCS: number;
  pctComAAA: number; comAAA: number; cartera: string; vigente: string;
  poliza: string; segmento: string; asesora: string; experian: string;
  canalContacto: string; llamadasTotal: number; llamadasLucia: number;
  llamadasWecall: number; whatsappTotal: number; whatsappLucia: number;
  whatsappAgente: number; comisionIngresoAAA: number; canalIngreso: string;
  fechaEmision: string; mesEmision: string;
}

interface SheetData {
  lastUpdated: string;
  ventas: Venta[];
  fidelizacion: FidRow[];
  filtros: {
    mesesVentas: string[]; mesesFid: string[]; estrategias: string[];
    asesoras: string[]; segmentos: string[]; comerciales: string[];
  };
}

const COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#0d9488", "#eab308", "#7c3aed",
  "#f97316", "#0ea5e9", "#65a30d",
];

const MES_V = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MES_F = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

function cop(v: number) { return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v); }
function num(v: number) { return new Intl.NumberFormat("es-CO").format(v); }
function pct(v: number, d = 1) { return v.toFixed(d) + "%"; }
function fmtM(m: string) { return m.charAt(0) + m.slice(1).toLowerCase(); }
function groupBy<T>(arr: T[], key: (i: T) => string) { const r: Record<string, T[]> = {}; for (const i of arr) { const k = key(i); (r[k] ??= []).push(i); } return r; }
function sumBy<T>(arr: T[], key: (i: T) => number) { return arr.reduce((s, i) => s + key(i), 0); }

const barCfg: ChartConfig = { value: { label: "Valor", color: "#3b82f6" } };
const primaCfg: ChartConfig = { prima: { label: "Prima Neta", color: "#22c55e" } };
const cntCfg: ChartConfig = { count: { label: "Cantidad", color: "#3b82f6" } };
const fidMCfg: ChartConfig = { total: { label: "Contactos", color: "#3b82f6" }, ventas: { label: "Ventas", color: "#22c55e" } };
const chDetCfg: ChartConfig = { lucia: { label: "LucIA", color: "#3b82f6" }, wecall: { label: "WeCall", color: "#8b5cf6" }, whatsappLucia: { label: "WA LucIA", color: "#22c55e" }, whatsappAgente: { label: "WA Agente", color: "#f59e0b" } };

// ========== COMPONENTS ==========
function KPICard({ title, value, sub, icon: Icon, color = "text-primary" }: {
  title: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[11px] md:text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className={"text-lg md:text-2xl font-bold tracking-tight " + color + " truncate"} title={value}>{value}</p>
            {sub && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
          <div className="rounded-full p-2 bg-muted/50">
            <Icon className={"h-4 w-4 md:h-5 md:w-5 " + color} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FiltSel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] md:text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full md:w-[170px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

const tickFmtM = (v: number) => { const m = v / 1_000_000; return "$" + m.toFixed(0) + "M"; };
const tickFmtM1 = (v: number) => { const m = v / 1_000_000; return "$" + m.toFixed(1) + "M"; };
const fmtCop = (v: unknown) => cop(Number(v));

function HBar({ data, nameKey = "name", valKey = "value", h = 300, wName = 100 }: { data: { name: string; value: number }[]; nameKey?: string; valKey?: string; h?: number; wName?: number }) {
  return (
    <ChartContainer config={barCfg} className={"w-full"} style={{ height: h + "px" }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey={nameKey} tick={{ fontSize: 9 }} width={wName} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={valKey} radius={[0, 4, 4, 0]}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
      </BarChart>
    </ChartContainer>
  );
}

function Donut({ data, h = 280 }: { data: { name: string; value: number }[]; h?: number }) {
  return (
    <ChartContainer config={barCfg} className="w-full" style={{ height: h + "px" }}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={90} paddingAngle={2} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-x-3 gap-y-1" />
      </PieChart>
    </ChartContainer>
  );
}

function LoadingSkeleton() {
  return (<div className="space-y-4 p-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div>);
}

// ========== MAIN ==========
export default function DashboardPage() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [fMesV, setFMesV] = useState("__all__");
  const [fComercial, setFComercial] = useState("__all__");
  const [fMesF, setFMesF] = useState("__all__");
  const [fEstrategia, setFEstrategia] = useState("__all__");
  const [fAsesora, setFAsesora] = useState("__all__");
  const [fSegmento, setFSegmento] = useState("__all__");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sheets");
      if (!res.ok) throw new Error("Error " + res.status);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json); setLastRefresh(new Date()); setCountdown(60); setError(null);
    } catch (err) { setError(String(err)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 60_000); return () => clearInterval(iv); }, [fetchData]);
  useEffect(() => { if (countdown <= 0) return; const t = setInterval(() => setCountdown((c) => c - 1), 1000); return () => clearInterval(t); }, [countdown]);

  const vF = useMemo(() => { if (!data) return []; return data.ventas.filter((r) => (fMesV === "__all__" || r.mes === fMesV) && (fComercial === "__all__" || r.comercial === fComercial)); }, [data, fMesV, fComercial]);
  const fF = useMemo(() => { if (!data) return []; return data.fidelizacion.filter((r) => (fMesF === "__all__" || r.mes === fMesF) && (fEstrategia === "__all__" || r.estrategia === fEstrategia) && (fAsesora === "__all__" || r.asesora === fAsesora) && (fSegmento === "__all__" || r.segmento === fSegmento)); }, [data, fMesF, fEstrategia, fAsesora, fSegmento]);

  // VENTAS KPIs
  const vK = useMemo(() => {
    const t = vF.length, p = sumBy(vF, (r) => r.primaNeta), ccs = sumBy(vF, (r) => r.comisionCCS), aaa = sumBy(vF, (r) => r.comisionAAA);
    const va = sumBy(vF, (r) => r.valorAsegurado), vig = vF.filter((r) => r.vigente).length;
    const g = groupBy(vF, (r) => r.movimiento);
    return { t, p, ccs, aaa, va, vig, pctV: t > 0 ? Math.round((vig / t) * 100) : 0, n: (g["NUEVO"] || []).length, r: (g["RENOVADO"] || []).length, pp: t > 0 ? p / t : 0 };
  }, [vF]);

  // VENTAS charts
  const vMes = useMemo(() => { const g = groupBy(vF, (r) => r.mes); return MES_V.filter((m) => g[m]).map((m) => { const i = g[m]; return { mes: fmtM(m), count: i.length, prima: sumBy(i, (r) => r.primaNeta) }; }); }, [vF]);
  const vAseg = useMemo(() => Object.entries(groupBy(vF, (r) => r.aseguradora)).sort((a, b) => b[1].length - a[1].length).map(([n, v]) => ({ name: n, value: v.length })), [vF]);
  const vCom = useMemo(() => Object.entries(groupBy(vF, (r) => r.comercial)).map(([n, i]) => ({ name: n, count: i.length, prima: sumBy(i, (r) => r.primaNeta) })).sort((a, b) => b.prima - a.prima), [vF]);
  const vMarca = useMemo(() => Object.entries(groupBy(vF, (r) => r.marca)).sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([n, v]) => ({ name: n, value: v.length })), [vF]);
  const vLinea = useMemo(() => Object.entries(groupBy(vF, (r) => r.linea)).map(([n, i]) => ({ name: n, value: i.length })).sort((a, b) => b.value - a.value).slice(0, 12), [vF]);
  const vConc = useMemo(() => Object.entries(groupBy(vF, (r) => r.concesionario)).sort((a, b) => b[1].length - a[1].length).slice(0, 12).map(([n, v]) => ({ name: n, value: v.length })), [vF]);
  const vAno = useMemo(() => Object.entries(groupBy(vF, (r) => r.modeloAno)).map(([n, i]) => ({ name: n, value: i.length })).sort((a, b) => a.name.localeCompare(b.name)).reverse().slice(0, 12), [vF]);
  const vFP = useMemo(() => Object.entries(groupBy(vF, (r) => r.formaPago)).sort((a, b) => b[1].length - a[1].length).map(([n, v]) => ({ name: n || "Sin info", value: v.length })), [vF]);
  const vFin = useMemo(() => Object.entries(groupBy(vF.filter((r) => r.financiera), (r) => r.financiera)).sort((a, b) => b[1].length - a[1].length).map(([n, v]) => ({ name: n, value: v.length })), [vF]);

  // FIDELIZACION KPIs
  const fK = useMemo(() => {
    const vr = fF.filter((r) => r.tipificacion === "CONTACTO_CERRADO");
    return { t: fF.length, v: vr.length, na: fF.filter((r) => r.tipificacion === "CONTACTO_NO_ACEPTA").length, nc: fF.filter((r) => r.tipificacion === "NO_CONTACTADO").length, vl: fF.filter((r) => r.tipificacion.includes("VOLVER")).length, ep: fF.filter((r) => r.tipificacion === "CONTACTADO_EN_PROCESO").length, tasa: fF.length > 0 ? (vr.length / fF.length) * 100 : 0, ll: sumBy(fF, (r) => r.llamadasTotal), wa: sumBy(fF, (r) => r.whatsappTotal), prima: sumBy(vr, (r) => r.primaNeta), comT: sumBy(vr, (r) => r.comTotal) };
  }, [fF]);

  // FIDELIZACION charts
  const fMes = useMemo(() => {
    const g = groupBy(fF, (x) => x.mes);
    return MES_F.filter((m) => g[m]).map((m) => {
      const items = g[m];
      const vr = items.filter((x) => x.tipificacion === "CONTACTO_CERRADO");
      return { mes: m, total: items.length, ventas: vr.length, prima: sumBy(vr, (x) => x.primaNeta) };
    });
  }, [fF]);
  const fTipi = useMemo(() => Object.entries(groupBy(fF, (x) => x.tipificacion)).sort((a, b) => b[1].length - a[1].length).map(([n, v]) => ({ name: n.replace(/_/g, " "), value: v.length })), [fF]);
  const fCanal = useMemo(() => Object.entries(groupBy(fF, (x) => x.canalContacto)).sort((a, b) => b[1].length - a[1].length).map(([n, v]) => ({ name: n, value: v.length })), [fF]);
  const fEstr = useMemo(() => {
    const grouped = groupBy(fF, (x) => x.estrategia);
    return Object.entries(grouped).map(([n, items]) => {
      const vr = items.filter((x) => x.tipificacion === "CONTACTO_CERRADO");
      return { name: n.replace(/_/g, " "), total: items.length, ventas: vr.length, prima: sumBy(vr, (x) => x.primaNeta), comT: sumBy(vr, (x) => x.comTotal) };
    }).sort((a, b) => b.ventas - a.ventas);
  }, [fF]);
  const fAses = useMemo(() => {
    const grouped = groupBy(fF, (x) => x.asesora);
    return Object.entries(grouped).map(([n, items]) => {
      const vr = items.filter((x) => x.tipificacion === "CONTACTO_CERRADO");
      return { name: n, total: items.length, ventas: vr.length, prima: sumBy(vr, (x) => x.primaNeta), ll: sumBy(items, (x) => x.llamadasTotal), wa: sumBy(items, (x) => x.whatsappTotal) };
    }).sort((a, b) => b.ventas - a.ventas);
  }, [fF]);
  const fNoA = useMemo(() => Object.entries(groupBy(fF.filter((x) => x.tipificacion === "CONTACTO_NO_ACEPTA"), (x) => x.informacion)).sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([n, v]) => ({ name: n, value: v.length })), [fF]);
  const fChDet = useMemo(() => {
    const g = groupBy(fF, (x) => x.mes);
    return MES_F.filter((m) => g[m]).map((m) => {
      const items = g[m];
      return { mes: m, lucia: sumBy(items, (x) => x.llamadasLucia), wecall: sumBy(items, (x) => x.llamadasWecall), whatsappLucia: sumBy(items, (x) => x.whatsappLucia), whatsappAgente: sumBy(items, (x) => x.whatsappAgente) };
    });
  }, [fF]);

  if (loading && !data) return <LoadingSkeleton />;
  if (error && !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <Activity className="h-12 w-12 text-muted-foreground" />
      <p className="text-lg font-medium">Error al cargar datos</p>
      <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
      <Button onClick={fetchData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button>
    </div>
  );
  if (!data) return null;
  const fo = data.filtros;
  const funnel = [
    { stage: "Total Contactos", value: fK.t, color: COLORS[0] },
    { stage: "Contactados", value: fK.t - fK.nc, color: COLORS[1] },
    { stage: "En Proceso / VL", value: fK.ep + fK.vl, color: COLORS[4] },
    { stage: "Ventas", value: fK.v, color: COLORS[1] },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center"><Shield className="h-5 w-5 text-white" /></div>
            <div><h1 className="text-base md:text-lg font-bold tracking-tight">ChevyPlan Dashboard</h1><p className="text-xs text-muted-foreground hidden sm:block">Seguros Automotrices en Tiempo Real</p></div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /><span>{lastRefresh.toLocaleTimeString("es-CO")}</span><Badge variant="secondary" className="ml-1 font-mono text-[10px]">{countdown}s</Badge></div>}
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5"><RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} /><span className="hidden sm:inline">Actualizar</span></Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-5">
        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ventas" className="gap-1.5"><BarChart3 className="h-4 w-4" />Ventas</TabsTrigger>
            <TabsTrigger value="fidelizacion" className="gap-1.5"><Phone className="h-4 w-4" />Fidelización</TabsTrigger>
          </TabsList>

          {/* ========== VENTAS ========== */}
          <TabsContent value="ventas" className="space-y-5 mt-5">
            <Card className="border-dashed">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-3"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span></div>
                <div className="flex flex-wrap gap-3">
                  <FiltSel label="Mes" value={fMesV} onChange={setFMesV} opts={fo.mesesVentas.map((m) => ({ value: m, label: fmtM(m) }))} />
                  <FiltSel label="Comercial" value={fComercial} onChange={setFComercial} opts={fo.comerciales.map((c) => ({ value: c, label: c }))} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="Total Pólizas" value={num(vK.t)} sub={num(vK.vig) + " vigentes"} icon={Shield} color="text-blue-600" />
              <KPICard title="Prima Neta Total" value={cop(vK.p)} sub="Acumulado" icon={DollarSign} color="text-emerald-600" />
              <KPICard title="Comisión CCS" value={cop(vK.ccs)} sub="Agencia" icon={TrendingUp} color="text-amber-600" />
              <KPICard title="Comisión AAA" value={cop(vK.aaa)} sub="Aliado" icon={TrendingUp} color="text-violet-600" />
              <KPICard title="Valor Asegurado" value={cop(vK.va)} sub="Suma asegurada" icon={Car} color="text-cyan-600" />
              <KPICard title="% Vigentes" value={pct(vK.pctV, 0)} sub={num(vK.vig) + " de " + num(vK.t)} icon={UserCheck} color="text-emerald-600" />
              <KPICard title="Nuevo / Renovado" value={vK.n + " / " + vK.r} sub="Nuevos / Renovados" icon={Activity} color="text-blue-600" />
              <KPICard title="Prima Promedio" value={cop(vK.pp)} sub="Por póliza" icon={Target} color="text-rose-600" />
            </div>

            {/* Pólizas + Prima por Mes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Pólizas por Mes</CardTitle></CardHeader><CardContent>
                <ChartContainer config={cntCfg} className="h-[280px] w-full">
                  <BarChart data={vMes} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Prima Neta por Mes</CardTitle></CardHeader><CardContent>
                <ChartContainer config={primaCfg} className="h-[280px] w-full">
                  <BarChart data={vMes} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={tickFmtM} />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={fmtCop} />
                    <Bar dataKey="prima" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent></Card>
            </div>

            {/* Aseguradora + Comercial */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Distribución por Aseguradora</CardTitle></CardHeader><CardContent><HBar data={vAseg} h={320} wName={100} /></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Top Comerciales por Prima</CardTitle></CardHeader><CardContent>
                <ChartContainer config={primaCfg} className="h-[320px] w-full">
                  <BarChart data={vCom} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={tickFmtM1} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={fmtCop} />
                    <Bar dataKey="prima" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent></Card>
            </div>

            {/* Marcas + Líneas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Top Marcas</CardTitle></CardHeader><CardContent><Donut data={vMarca} /></CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Top Líneas de Vehículo</CardTitle></CardHeader><CardContent><HBar data={vLinea} h={280} wName={130} /></CardContent></Card>
            </div>

            {/* Modelo Año + Concesionario */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Distribución por Modelo (Año)</CardTitle></CardHeader><CardContent>
                <ChartContainer config={cntCfg} className="h-[250px] w-full">
                  <BarChart data={vAno} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>{vAno.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Top Concesionarios</CardTitle></CardHeader><CardContent><HBar data={vConc} h={250} wName={120} /></CardContent></Card>
            </div>

            {/* Forma Pago + Financiera */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Forma de Pago</CardTitle></CardHeader><CardContent>
                <ChartContainer config={barCfg} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={vFP} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%"} labelLine={false}>
                      {vFP.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Financieras</CardTitle></CardHeader><CardContent><HBar data={vFin} h={250} wName={100} /></CardContent></Card>
            </div>
          </TabsContent>

          {/* ========== FIDELIZACION ========== */}
          <TabsContent value="fidelizacion" className="space-y-5 mt-5">
            <Card className="border-dashed">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-3"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span></div>
                <div className="flex flex-wrap gap-3">
                  <FiltSel label="Mes" value={fMesF} onChange={setFMesF} opts={fo.mesesFid.map((m) => ({ value: m, label: fmtM(m) }))} />
                  <FiltSel label="Estrategia" value={fEstrategia} onChange={setFEstrategia} opts={fo.estrategias.map((e) => ({ value: e, label: e.replace(/_/g, " ") }))} />
                  <FiltSel label="Asesora" value={fAsesora} onChange={setFAsesora} opts={fo.asesoras.filter((a) => a !== "SI" && a !== "NO").map((a) => ({ value: a, label: a }))} />
                  <FiltSel label="Segmento" value={fSegmento} onChange={setFSegmento} opts={fo.segmentos.filter((s) => s).map((s) => ({ value: s, label: s }))} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="Total Contactos" value={num(fK.t)} sub="Gestión" icon={Users} color="text-blue-600" />
              <KPICard title="Ventas" value={num(fK.v)} sub={"Tasa: " + pct(fK.tasa)} icon={Target} color="text-emerald-600" />
              <KPICard title="No Acepta" value={num(fK.na)} sub={pct(fK.t > 0 ? (fK.na / fK.t) * 100 : 0) + " del total"} icon={ArrowDownRight} color="text-red-500" />
              <KPICard title="No Contactados" value={num(fK.nc)} sub={pct(fK.t > 0 ? (fK.nc / fK.t) * 100 : 0) + " del total"} icon={Phone} color="text-amber-600" />
              <KPICard title="Volver a Llamar" value={num(fK.vl)} sub="Seguimiento" icon={Phone} color="text-blue-500" />
              <KPICard title="En Proceso" value={num(fK.ep)} sub="Activa" icon={Activity} color="text-violet-600" />
              <KPICard title="Llamadas / WhatsApp" value={num(fK.ll) + " / " + num(fK.wa)} sub="Interacciones" icon={Phone} color="text-cyan-600" />
              <KPICard title="Prima Fidelización" value={cop(fK.prima)} sub={fK.v > 0 ? "Comisiones: " + cop(fK.comT) : undefined} icon={DollarSign} color="text-emerald-600" />
            </div>

            {/* Embudo */}
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Embudo de Conversión</CardTitle><CardDescription>Del contacto a la venta</CardDescription></CardHeader><CardContent>
              <div className="space-y-3 max-w-2xl mx-auto">
                {funnel.map((s, i) => { const p = fK.t > 0 ? (s.value / fK.t) * 100 : 0; return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="font-medium">{s.stage}</span><span className="text-muted-foreground">{num(s.value)} ({pct(p)})</span></div>
                    <div className="h-8 rounded-md bg-gray-100 overflow-hidden relative">
                      <div className="h-full rounded-md transition-all duration-700" style={{ width: Math.max(p, 2) + "%", backgroundColor: s.color }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">{pct(p)}</span>
                    </div>
                  </div>
                ); })}
              </div>
            </CardContent></Card>

            {/* Fid por Mes + Tipificación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Fidelización por Mes</CardTitle></CardHeader><CardContent>
                <ChartContainer config={fidMCfg} className="h-[280px] w-full">
                  <BarChart data={fMes} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Tipificación de Contacto</CardTitle></CardHeader><CardContent><Donut data={fTipi} /></CardContent></Card>
            </div>

            {/* Motivos No Aceptación + Canal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Motivos de No Aceptación</CardTitle><CardDescription>Principales razones de pérdida</CardDescription></CardHeader><CardContent>
                <HBar data={fNoA} h={300} wName={130} />
              </CardContent></Card>
              <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Canal de Contacto</CardTitle></CardHeader><CardContent>
                <ChartContainer config={barCfg} className="h-[300px] w-full">
                  <PieChart>
                    <Pie data={fCanal} cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => name + " " + (percent * 100).toFixed(0) + "%"} labelLine={false}>
                      {fCanal.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent></Card>
            </div>

            {/* Canales Detallados */}
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Detalle de Canales por Mes</CardTitle><CardDescription>Desglose LucIA vs WeCall vs WhatsApp</CardDescription></CardHeader><CardContent>
              <ChartContainer config={chDetCfg} className="h-[300px] w-full">
                <BarChart data={fChDet} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="lucia" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="wecall" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="whatsappLucia" stackId="b" fill="#22c55e" />
                  <Bar dataKey="whatsappAgente" stackId="b" fill="#f59e0b" />
                </BarChart>
              </ChartContainer>
            </CardContent></Card>

            {/* Tabla Estrategia */}
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Rendimiento por Estrategia</CardTitle><CardDescription>Ventas, prima y comisiones generadas</CardDescription></CardHeader><CardContent>
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 pr-4">Estrategia</th><th className="pb-2 pr-4 text-right">Contactos</th><th className="pb-2 pr-4 text-right">Ventas</th><th className="pb-2 pr-4 text-right">Tasa</th><th className="pb-2 pr-4 text-right">Prima</th><th className="pb-2 text-right">Comisiones</th></tr></thead>
                <tbody>{fEstr.map((e) => (<tr key={e.name} className="border-b hover:bg-muted/50"><td className="py-2 pr-4 font-medium">{e.name}</td><td className="py-2 pr-4 text-right">{num(e.total)}</td><td className="py-2 pr-4 text-right">{num(e.ventas)}</td><td className="py-2 pr-4 text-right">{pct(e.total > 0 ? (e.ventas / e.total) * 100 : 0)}</td><td className="py-2 pr-4 text-right">{cop(e.prima)}</td><td className="py-2 text-right">{cop(e.comT)}</td></tr>))}</tbody>
              </table></div>
            </CardContent></Card>

            {/* Tabla Asesoras */}
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm">Rendimiento por Asesora</CardTitle><CardDescription>Detalle con tasa de conversión, prima y actividad</CardDescription></CardHeader><CardContent>
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="pb-2 pr-4">Asesora</th><th className="pb-2 pr-4 text-right">Contactos</th><th className="pb-2 pr-4 text-right">Ventas</th><th className="pb-2 pr-4 text-right">Tasa</th><th className="pb-2 pr-4 text-right">Prima</th><th className="pb-2 pr-4 text-right">Llamadas</th><th className="pb-2 text-right">WhatsApp</th></tr></thead>
                <tbody>{fAses.filter((a) => a.name !== "SI" && a.name !== "NO").map((a) => (<tr key={a.name} className="border-b hover:bg-muted/50"><td className="py-2 pr-4 font-medium">{a.name}</td><td className="py-2 pr-4 text-right">{num(a.total)}</td><td className="py-2 pr-4 text-right">{num(a.ventas)}</td><td className="py-2 pr-4 text-right">{pct(a.total > 0 ? (a.ventas / a.total) * 100 : 0)}</td><td className="py-2 pr-4 text-right">{cop(a.prima)}</td><td className="py-2 pr-4 text-right">{num(a.ll)}</td><td className="py-2 text-right">{num(a.wa)}</td></tr>))}</tbody>
              </table></div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
        <footer className="mt-6 pb-4 text-center text-xs text-muted-foreground">Datos actualizados cada 60s desde Google Sheets &middot; ChevyPlan Dashboard</footer>
      </main>
    </div>
  );
}