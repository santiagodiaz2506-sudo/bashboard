"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, TrendingUp, Users, DollarSign, Phone, MessageSquare,
  RefreshCw, Clock, Target, Car, Building2, UserCheck, BarChart3,
  ArrowUpRight, ArrowDownRight, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Types
interface VentasKPIs {
  totalPolizas: number;
  totalPrima: number;
  totalComisionCCS: number;
  totalComisionAAA: number;
  totalValorAsegurado: number;
  vigentesCount: number;
  pctVigentes: number;
}
interface FidelizacionKPIs {
  totalContactos: number;
  ventas: number;
  noAcepta: number;
  noContactado: number;
  volverLlamar: number;
  enProceso: number;
  tasaConversion: number;
  totalLlamadas: number;
  totalWhatsapp: number;
  primaFidelizacion: number;
}
interface SheetData {
  lastUpdated: string;
  ventas: {
    kpis: VentasKPIs;
    porMes: { mes: string; count: number; prima: number }[];
    porAseguradora: { name: string; value: number }[];
    porComercial: { name: string; count: number; prima: number }[];
    porMarca: { name: string; value: number }[];
    porLinea: { name: string; marca: string; value: number }[];
    porConcesionario: { name: string; value: number }[];
    porMovimiento: Record<string, number>;
  };
  fidelizacion: {
    kpis: FidelizacionKPIs;
    porMes: { mes: string; total: number; ventas: number; prima: number }[];
    porTipificacion: { name: string; value: number }[];
    porCanal: { name: string; value: number }[];
    porEstrategia: { name: string; total: number; ventas: number }[];
    porAsesora: { name: string; total: number; ventas: number }[];
  };
}

const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(190, 90%, 50%)",
  "hsl(330, 81%, 60%)", "hsl(173, 80%, 40%)", "hsl(45, 93%, 47%)",
  "hsl(280, 75%, 55%)", "hsl(15, 90%, 55%)", "hsl(200, 85%, 45%)",
  "hsl(100, 60%, 40%)",
];

function formatCOP(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString("es-CO")}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-CO");
}

// Chart configs
const ventasChartConfig: ChartConfig = {
  polizas: { label: "Pólizas", color: "hsl(221, 83%, 53%)" },
  prima: { label: "Prima Neta", color: "hsl(142, 71%, 45%)" },
};

const aseguradoraChartConfig: ChartConfig = {
  value: { label: "Pólizas", color: "hsl(221, 83%, 53%)" },
};

const tipificacionConfig: ChartConfig = {
  ventas: { label: "Venta", color: "hsl(142, 71%, 45%)" },
  noAcepta: { label: "No Acepta", color: "hsl(0, 84%, 60%)" },
  noContactado: { label: "No Contactado", color: "hsl(38, 92%, 50%)" },
  volver: { label: "Volver a Llamar", color: "hsl(221, 83%, 53%)" },
  enProceso: { label: "En Proceso", color: "hsl(262, 83%, 58%)" },
};

const fidMesConfig: ChartConfig = {
  total: { label: "Contactos", color: "hsl(221, 83%, 53%)" },
  ventas: { label: "Ventas", color: "hsl(142, 71%, 45%)" },
};

const comercialConfig: ChartConfig = {
  prima: { label: "Prima Neta", color: "hsl(221, 83%, 53%)" },
};

function KPICard({
  title, value, subtitle, icon: Icon, trend, color = "text-primary",
}: {
  title: string; value: string; subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean }; color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className={`text-xl md:text-3xl font-bold tracking-tight ${color}`}>{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {trend && (
                  trend.positive
                    ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    : <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span>{subtitle}</span>
              </div>
            )}
          </div>
          <div className={`rounded-full p-2 md:p-3 ${color.replace("text-", "bg-").replace("text-primary", "bg-primary/10")} opacity-80`}>
            <Icon className={`h-4 w-4 md:h-6 md:w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sheets");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastRefresh(new Date());
      setCountdown(60);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 60s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (loading && !data) return <LoadingSkeleton />;
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <Activity className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Error al cargar datos</p>
        <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={fetchData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button>
      </div>
    );
  }
  if (!data) return null;

  const v = data.ventas;
  const f = data.fidelizacion;

  // Prepare funnel data
  const funnelData = [
    { stage: "Total Contactos", value: f.kpis.totalContactos, color: COLORS[0] },
    { stage: "Contactados", value: f.kpis.totalContactos - f.kpis.noContactado, color: COLORS[1] },
    { stage: "En Proceso / VL", value: f.kpis.enProceso + f.kpis.volverLlamar, color: COLORS[4] },
    { stage: "Ventas", value: f.kpis.ventas, color: COLORS[1] },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight">ChevyPlan Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Seguros Automotrices en Tiempo Real</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Actualizado: {lastRefresh.toLocaleTimeString("es-CO")}</span>
                <Badge variant="secondary" className="ml-1 font-mono text-[10px]">{countdown}s</Badge>
              </div>
            )}
            <Button
              variant="outline" size="sm"
              onClick={fetchData} disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <Tabs defaultValue="ventas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="ventas" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />Ventas
            </TabsTrigger>
            <TabsTrigger value="fidelizacion" className="gap-1.5">
              <Phone className="h-4 w-4" />Fidelización
            </TabsTrigger>
          </TabsList>

          {/* ===================== VENTAS TAB ===================== */}
          <TabsContent value="ventas" className="space-y-6 mt-6">
            {/* KPIs Ventas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Pólizas" value={formatNumber(v.kpis.totalPolizas)}
                subtitle={`${formatNumber(v.kpis.vigentesCount)} vigentes`}
                icon={Shield} color="text-blue-600"
              />
              <KPICard
                title="Prima Neta Total" value={formatCOP(v.kpis.totalPrima)}
                subtitle="Acumulado periodos"
                icon={DollarSign} color="text-emerald-600"
              />
              <KPICard
                title="Comisión CCS" value={formatCOP(v.kpis.totalComisionCCS)}
                subtitle="Comisión agencia"
                icon={TrendingUp} color="text-amber-600"
              />
              <KPICard
                title="Comisión AAA" value={formatCOP(v.kpis.totalComisionAAA)}
                subtitle="Comisión AAA"
                icon={TrendingUp} color="text-violet-600"
              />
              <KPICard
                title="Valor Asegurado" value={formatCOP(v.kpis.totalValorAsegurado)}
                subtitle="Suma asegurada"
                icon={Car} color="text-cyan-600"
              />
              <KPICard
                title="% Vigentes" value={`${v.kpis.pctVigentes}%`}
                subtitle={`${formatNumber(v.kpis.vigentesCount)} de ${formatNumber(v.kpis.totalPolizas)}`}
                icon={UserCheck} color="text-emerald-600"
              />
              <KPICard
                title="Nuevo vs Renovado"
                value={`${v.porMovimiento["NUEVO"] || 0} / ${v.porMovimiento["RENOVADO"] || 0}`}
                subtitle="Nuevos / Renovados"
                icon={Activity} color="text-blue-600"
              />
              <KPICard
                title="Prima x Póliza Prom"
                value={formatCOP(v.kpis.totalPolizas > 0 ? v.kpis.totalPrima / v.kpis.totalPolizas : 0)}
                subtitle="Ticket promedio"
                icon={Target} color="text-rose-600"
              />
            </div>

            {/* Charts Row 1: Pólizas por Mes + Prima por Mes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Pólizas por Mes</CardTitle>
                  <CardDescription>Cantidad de pólizas emitidas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={ventasChartConfig} className="h-[300px] w-full">
                    <BarChart data={v.porMes} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" name="polizas" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Prima Neta por Mes</CardTitle>
                  <CardDescription>Ingresos por prima mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={ventasChartConfig} className="h-[300px] w-full">
                    <AreaChart data={v.porMes} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
                      <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatCOP(value as number)} />
                      <defs>
                        <linearGradient id="primaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="prima" name="prima" stroke="hsl(142, 71%, 45%)" fill="url(#primaGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2: Aseguradora + Comercial */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Distribución por Aseguradora</CardTitle>
                  <CardDescription>Pólizas por compañía aseguradora</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={aseguradoraChartConfig} className="h-[350px] w-full">
                    <BarChart data={v.porAseguradora} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {v.porAseguradora.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Top 10 Comerciales por Prima</CardTitle>
                  <CardDescription>Rendimiento en prima neta</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={comercialConfig} className="h-[350px] w-full">
                    <BarChart data={v.porComercial} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                      <ChartTooltip content={<ChartTooltipContent />} formatter={(value) => formatCOP(value as number)} />
                      <Bar dataKey="prima" radius={[0, 4, 4, 0]} fill="hsl(221, 83%, 53%)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 3: Marcas + Líneas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Top 10 Marcas</CardTitle>
                  <CardDescription>Distribución por marca de vehículo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={aseguradoraChartConfig} className="h-[320px] w-full">
                    <PieChart>
                      <Pie
                        data={v.porMarca}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {v.porMarca.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-x-4 gap-y-1" />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Top 15 Líneas de Vehículo</CardTitle>
                  <CardDescription>Modelos más vendidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={aseguradoraChartConfig} className="h-[320px] w-full">
                    <BarChart data={v.porLinea} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={140} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {v.porLinea.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 4: Concesionarios */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">Distribución por Concesionario</CardTitle>
                <CardDescription>Pólizas emitidas por concesionario</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={aseguradoraChartConfig} className="h-[280px] w-full">
                  <BarChart data={v.porConcesionario} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {v.porConcesionario.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== FIDELIZACION TAB ===================== */}
          <TabsContent value="fidelizacion" className="space-y-6 mt-6">
            {/* KPIs Fidelización */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Contactos" value={formatNumber(f.kpis.totalContactos)}
                subtitle="Gestión de fidelización"
                icon={Users} color="text-blue-600"
              />
              <KPICard
                title="Ventas Logradas" value={formatNumber(f.kpis.ventas)}
                subtitle={`Tasa: ${f.kpis.tasaConversion}%`}
                icon={Target} color="text-emerald-600"
              />
              <KPICard
                title="No Acepta" value={formatNumber(f.kpis.noAcepta)}
                subtitle={`${((f.kpis.noAcepta / f.kpis.totalContactos) * 100).toFixed(1)}% del total`}
                icon={ArrowDownRight} color="text-red-500"
              />
              <KPICard
                title="No Contactados" value={formatNumber(f.kpis.noContactado)}
                subtitle={`${((f.kpis.noContactado / f.kpis.totalContactos) * 100).toFixed(1)}% del total`}
                icon={Phone} color="text-amber-600"
              />
              <KPICard
                title="Volver a Llamar" value={formatNumber(f.kpis.volverLlamar)}
                subtitle="Seguimiento pendiente"
                icon={Phone} color="text-blue-500"
              />
              <KPICard
                title="En Proceso" value={formatNumber(f.kpis.enProceso)}
                subtitle="Gestión activa"
                icon={Activity} color="text-violet-600"
              />
              <KPICard
                title="Total Llamadas" value={formatNumber(f.kpis.totalLlamadas)}
                subtitle={`${formatNumber(f.kpis.totalWhatsapp)} WhatsApp`}
                icon={Phone} color="text-cyan-600"
              />
              <KPICard
                title="Prima Fidelización" value={formatCOP(f.kpis.primaFidelizacion)}
                subtitle="Prima por fidelización"
                icon={DollarSign} color="text-emerald-600"
              />
            </div>

            {/* Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm md:text-base">Embudo de Conversión</CardTitle>
                <CardDescription>Del contacto a la venta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-w-2xl mx-auto">
                  {funnelData.map((step, i) => {
                    const pct = f.kpis.totalContactos > 0 ? (step.value / f.kpis.totalContactos) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{step.stage}</span>
                          <span className="text-muted-foreground">{formatNumber(step.value)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-8 rounded-md bg-gray-100 overflow-hidden relative">
                          <div
                            className="h-full rounded-md transition-all duration-700"
                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: step.color }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-sm">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Charts: Fidelización por Mes + Tipificación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Fidelización por Mes</CardTitle>
                  <CardDescription>Contactos y ventas mensuales</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={fidMesConfig} className="h-[300px] w-full">
                    <BarChart data={f.porMes} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" name="total" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ventas" name="ventas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Tipificación de Contacto</CardTitle>
                  <CardDescription>Distribución de resultados de gestión</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={tipificacionConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie
                        data={f.porTipificacion.map((d) => ({
                          ...d,
                          name: d.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {f.porTipificacion.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap gap-x-3 gap-y-1" />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts: Canal de Contacto + Estrategia */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Canal de Contacto</CardTitle>
                  <CardDescription>Medio de primer contacto con el cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={aseguradoraChartConfig} className="h-[280px] w-full">
                    <PieChart>
                      <Pie
                        data={f.porCanal}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {f.porCanal.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Rendimiento por Estrategia</CardTitle>
                  <CardDescription>Ventas vs contactos por tipo de estrategia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={fidMesConfig} className="h-[280px] w-full">
                    <BarChart data={f.porEstrategia.map((d) => ({
                      ...d,
                      name: d.name.replace(/_/g, " "),
                      tasa: d.total > 0 ? parseFloat(((d.ventas / d.total) * 100).toFixed(1)) : 0,
                    }))} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" name="total" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ventas" name="ventas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Asesora performance */}
            {f.porAsesora.length > 0 && f.porAsesora[0].name !== "NO" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm md:text-base">Rendimiento por Asesora</CardTitle>
                  <CardDescription>Contactos gestionados y ventas logradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={fidMesConfig} className="h-[300px] w-full">
                    <BarChart data={f.porAsesora.filter((a) => a.name !== "NO").map((d) => ({
                      ...d,
                      tasa: d.total > 0 ? parseFloat(((d.ventas / d.total) * 100).toFixed(1)) : 0,
                    }))} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="total" name="total" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ventas" name="ventas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-8 pb-4 text-center text-xs text-muted-foreground">
          <p>Datos actualizados cada 60 segundos desde Google Sheets &middot; ChevyPlan Dashboard</p>
        </footer>
      </main>
    </div>
  );
}