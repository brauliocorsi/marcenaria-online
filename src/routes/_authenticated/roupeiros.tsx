import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Shirt, Columns3, ArrowLeft, ArrowRight, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Module3D } from "@/components/viewer/Module3D";

const MIN_COL_MM = 200;
const MIN_SEC_MM = 50;
const TOL_MM = 1;

import {
  DEFAULT_MODULE_CONFIG, calcularPecas, colunasIntervalos,
  resolverEspessuras,
  type ModuleConfig, type Secao, type SecaoTipo, type EspelhoModo, type ColunaRoupeiro,
} from "@/lib/engines/module";
import { upsertModule } from "@/lib/modules.functions";

export const Route = createFileRoute("/_authenticated/roupeiros")({
  component: RoupeirosPage,
});

const SECAO_LABEL: Record<SecaoTipo, string> = {
  nicho_aberto: "Nicho aberto",
  porta: "Porta batente",
  gavetas: "Gaveteiro",
  varao: "Cabide (varão)",
  maleiro_aberto: "Maleiro aberto",
  maleiro_fechado: "Maleiro fechado",
};

type DoorMode = "sem" | "batente" | "correr";

const DEFAULT_CORRER = {
  ativo: true,
  nFolhas: 2 as 2 | 3 | 4,
  espelho: "nenhum" as EspelhoModo,
  perfilLarguraMm: 25,
  perfilEspessuraMm: 20,
  recuoFrente: 5,
  alturaCalhaSup: 40,
  alturaCalhaInf: 40,
  folga: 10,
  sobreposicao: 40,
};

const MALEIRO_DEFAULT_KEY = "roupeiros.maleiroDefault.v1";
type MaleiroDefault = { altura_mm: number; nPrateleiras: number };
const FALLBACK_MALEIRO: MaleiroDefault = { altura_mm: 450, nPrateleiras: 1 };
function loadMaleiroDefault(): MaleiroDefault {
  if (typeof window === "undefined") return FALLBACK_MALEIRO;
  try {
    const raw = window.localStorage.getItem(MALEIRO_DEFAULT_KEY);
    if (!raw) return FALLBACK_MALEIRO;
    const p = JSON.parse(raw);
    return { altura_mm: Math.max(150, Number(p.altura_mm) || 450), nPrateleiras: Math.max(0, Math.min(6, Number(p.nPrateleiras) || 1)) };
  } catch { return FALLBACK_MALEIRO; }
}

function uid() { return crypto.randomUUID(); }

function defaultColumns(W: number, lateral: number): ColunaRoupeiro[] {
  const usable = W - 2 * lateral;
  const divEsp = lateral;
  // 3 colunas: gavetas | varão | varão
  const w = Math.floor((usable - 2 * divEsp) / 3);
  const rest = usable - 2 * divEsp - 2 * w;
  return [
    { id: uid(), largura_mm: w, secoes: [
      { id: uid(), altura_mm: 700, tipo: "gavetas", config: { nGavetas: 4 } },
      { id: uid(), altura_mm: 600, tipo: "varao", config: {} },
      { id: uid(), altura_mm: 1062, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } },
    ]},
    { id: uid(), largura_mm: w, secoes: [
      { id: uid(), altura_mm: 1300, tipo: "varao", config: {} },
      { id: uid(), altura_mm: 1062, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } },
    ]},
    { id: uid(), largura_mm: w + rest, secoes: [
      { id: uid(), altura_mm: 1300, tipo: "varao", config: {} },
      { id: uid(), altura_mm: 1062, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } },
    ]},
  ];
}

function makeInitialConfig(): ModuleConfig {
  const c: ModuleConfig = {
    ...DEFAULT_MODULE_CONFIG,
    dims: { width: 2400, height: 2400, depth: 600 },
    categoria: "roupeiro",
    portas: { ...DEFAULT_MODULE_CONFIG.portas, nPortas: 0 },
    gavetas: { ...DEFAULT_MODULE_CONFIG.gavetas, nGavetas: 0 },
    colunas: [],
  };
  c.colunas = defaultColumns(c.dims.width, 19);
  return c;
}

function RoupeirosPage() {
  const qc = useQueryClient();
  const upsert = useMutation({
    mutationFn: useServerFn(upsertModule),
    onSuccess: () => {
      toast.success("Roupeiro guardado na biblioteca");
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a guardar"),
  });

  const [nome, setNome] = useState<string>("Roupeiro");
  const [config, setConfig] = useState<ModuleConfig>(() => makeInitialConfig());
  const [doorMode, setDoorMode] = useState<DoorMode>("sem");
  const [drawerPct, setDrawerPct] = useState<number>(0);
  const [doorAngle, setDoorAngle] = useState<number>(0);
  const [activeCol, setActiveCol] = useState<number>(0);
  const [maleiroDefault, setMaleiroDefault] = useState<MaleiroDefault>(() => loadMaleiroDefault());

  const colunas = config.colunas ?? [];
  const ci = useMemo(() => colunasIntervalos(config), [config]);
  const e = useMemo(() => resolverEspessuras(config.espessuraPadrao, config.espessuras), [config]);
  const alturaInterna = config.dims.height - e.base - e.tampo;

  const somaLargCols = colunas.reduce((s, c) => s + c.largura_mm, 0);
  const espDivCols = e.lateral * Math.max(0, colunas.length - 1);
  const totalLarg = somaLargCols + espDivCols;
  const deltaLarg = totalLarg - ci.larguraInterna;
  const larguraOK = Math.abs(deltaLarg) < TOL_MM;
  const colsAbaixoMin = colunas
    .map((c, i) => ({ i, w: c.largura_mm }))
    .filter((c) => c.w < MIN_COL_MM);

  // Validação de alturas por coluna
  const alturasPorCol = colunas.map((c) => {
    const secs = c.secoes ?? [];
    const soma = secs.reduce((s, x) => s + x.altura_mm, 0);
    const divs = e.prateleira * Math.max(0, secs.length - 1);
    const total = soma + divs;
    return { total, delta: total - alturaInterna, ok: Math.abs(total - alturaInterna) < TOL_MM, vazia: secs.length === 0 };
  });
  const colsAltInvalidas = alturasPorCol
    .map((a, i) => ({ ...a, i }))
    .filter((a) => !a.ok || a.vazia);
  const semColunas = colunas.length === 0;
  const formValido = larguraOK && colsAbaixoMin.length === 0 && colsAltInvalidas.length === 0 && !semColunas;

  // Auto-ajuste: a última secção (topo) de cada coluna absorve a diferença para fechar a soma = alturaInterna
  const normalizingRef = useRef(false);
  useEffect(() => {
    if (normalizingRef.current) { normalizingRef.current = false; return; }
    if (!colunas.length) return;
    let mutated = false;
    const next = colunas.map((c) => {
      const secs = c.secoes ?? [];
      if (secs.length === 0) return c;
      const divs = e.prateleira * (secs.length - 1);
      const others = secs.slice(0, -1).reduce((s, x) => s + x.altura_mm, 0);
      const target = Math.round(alturaInterna - others - divs);
      const top = secs[secs.length - 1];
      if (target < MIN_SEC_MM) return c; // não vale a pena, deixa validador apontar
      if (Math.abs(top.altura_mm - target) < 1) return c;
      mutated = true;
      const newSecs = secs.slice();
      newSecs[newSecs.length - 1] = { ...top, altura_mm: target };
      return { ...c, secoes: newSecs };
    });
    if (mutated) {
      normalizingRef.current = true;
      setConfig((cfg) => ({ ...cfg, colunas: next }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alturaInterna, e.prateleira, JSON.stringify(colunas.map((c) => ({ n: c.secoes?.length ?? 0, h: (c.secoes ?? []).slice(0, -1).map((s) => s.altura_mm) })))]);

  const setDims = (k: "width" | "height" | "depth", v: number) =>
    setConfig((c) => ({ ...c, dims: { ...c.dims, [k]: Math.max(100, Math.round(v)) } }));

  const setColunas = (next: ColunaRoupeiro[]) =>
    setConfig((c) => ({ ...c, colunas: next }));

  const addColuna = () => {
    const id = uid();
    const newCol: ColunaRoupeiro = { id, largura_mm: 600, secoes: [
      { id: uid(), altura_mm: 1300, tipo: "varao", config: {} },
      { id: uid(), altura_mm: 1062, tipo: "maleiro_aberto", config: { nPrateleiras: 1 } },
    ]};
    setColunas([...colunas, newCol]);
    setActiveCol(colunas.length);
  };
  const removeColuna = (i: number) => {
    const next = colunas.slice(); next.splice(i, 1);
    setColunas(next);
    if (activeCol >= next.length) setActiveCol(Math.max(0, next.length - 1));
  };
  const moveColuna = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= colunas.length) return;
    const next = colunas.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setColunas(next);
    setActiveCol(j);
  };
  const updColuna = (i: number, patch: Partial<ColunaRoupeiro>) =>
    setColunas(colunas.map((c, k) => k === i ? { ...c, ...patch } : c));

  const autoLarguras = () => {
    if (colunas.length === 0) return;
    const usable = ci.larguraInterna - espDivCols;
    const w = Math.floor(usable / colunas.length);
    const rest = usable - w * colunas.length;
    setColunas(colunas.map((c, i) => ({ ...c, largura_mm: i === colunas.length - 1 ? w + rest : w })));
  };

  // Secções dentro da coluna ativa
  const col = colunas[activeCol];
  const secoes = col?.secoes ?? [];
  const somaAlt = secoes.reduce((s, x) => s + x.altura_mm, 0);
  const espDivSec = e.prateleira * Math.max(0, secoes.length - 1);
  const totalAlt = somaAlt + espDivSec;
  const alturaOK = Math.abs(totalAlt - alturaInterna) < 1;

  const setSecoes = (next: Secao[]) => {
    if (!col) return;
    updColuna(activeCol, { secoes: next });
  };
  const addSecao = (tipo: SecaoTipo) => {
    const id = uid();
    const defaultCfg: any =
      tipo === "varao" ? { prateleiraSuperior: false, recuoTopoVarao_mm: 40, alturaUtilRoupa_mm: 1000 } :
      tipo === "maleiro_aberto" ? { nPrateleiras: maleiroDefault.nPrateleiras } :
      tipo === "maleiro_fechado" ? { nPortas: 2, nPrateleiras: maleiroDefault.nPrateleiras } :
      tipo === "porta" ? { nPortas: 2 } :
      tipo === "gavetas" ? { nGavetas: 3, interno: true, frenteCega: true } :
      {};
    const def: Record<SecaoTipo, number> = {
      varao: 1000, maleiro_aberto: maleiroDefault.altura_mm, maleiro_fechado: maleiroDefault.altura_mm,
      porta: 1200, gavetas: 700, nicho_aberto: 400,
    };
    setSecoes([...secoes, { id, altura_mm: def[tipo], tipo, config: defaultCfg }]);
  };
  const removeSecao = (id: string) => setSecoes(secoes.filter((s) => s.id !== id));
  const moveSecao = (id: string, dir: -1 | 1) => {
    const i = secoes.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= secoes.length) return;
    const next = secoes.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setSecoes(next);
  };
  const updSecao = (id: string, patch: Partial<Secao>) =>
    setSecoes(secoes.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updSecaoCfg = (id: string, patch: Record<string, any>) =>
    setSecoes(secoes.map((s) => (s.id === id ? { ...s, config: { ...(s.config ?? {}), ...patch } } : s)));

  const autoAlturas = () => {
    if (secoes.length === 0) return;
    const usable = alturaInterna - espDivSec;
    const h = Math.floor(usable / secoes.length);
    const rest = usable - h * secoes.length;
    setSecoes(secoes.map((s, i) => ({ ...s, altura_mm: i === secoes.length - 1 ? h + rest : h })));
  };

  const aplicarDoorMode = (mode: DoorMode) => {
    setDoorMode(mode);
    setConfig((c) => {
      const portas = { ...c.portas };
      if (mode === "correr") portas.correr = { ...DEFAULT_CORRER };
      else delete portas.correr;
      return { ...c, portas };
    });
  };

  const onSave = () => {
    if (!formValido) {
      const msgs: string[] = [];
      if (semColunas) msgs.push("Adiciona pelo menos uma coluna.");
      if (!larguraOK) msgs.push(`Larguras somam ${Math.round(totalLarg)} mm mas o módulo interno tem ${Math.round(ci.larguraInterna)} mm (Δ ${deltaLarg > 0 ? "+" : ""}${Math.round(deltaLarg)} mm).`);
      if (colsAbaixoMin.length) msgs.push(`Coluna(s) ${colsAbaixoMin.map((c) => c.i + 1).join(", ")} abaixo do mínimo (${MIN_COL_MM} mm).`);
      if (colsAltInvalidas.length) msgs.push(`Altura inválida nas colunas: ${colsAltInvalidas.map((a) => `${a.i + 1}${a.vazia ? " (vazia)" : ` (Δ ${a.delta > 0 ? "+" : ""}${Math.round(a.delta)} mm)`}`).join(", ")}.`);
      toast.error(msgs.join(" "));
      return;
    }
    const pecas = calcularPecas(config);
    upsert.mutate({
      data: {
        name: nome || "Roupeiro",
        width_mm: config.dims.width,
        height_mm: config.dims.height,
        depth_mm: config.dims.depth,
        config: config as any,
        pieces: pecas as any,
      },
    } as any);
  };

  // sliding-door helpers
  const cr = config.portas.correr;
  const setCr = (patch: Partial<NonNullable<ModuleConfig["portas"]["correr"]>>) =>
    setConfig((c) => ({ ...c, portas: { ...c.portas, correr: { ...(c.portas.correr ?? DEFAULT_CORRER), ...patch } } }));

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[520px_1fr]">
      <div className="space-y-3 max-h-[calc(100vh-2rem)] overflow-auto pr-1">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Shirt className="h-4 w-4" /> <CardTitle className="text-sm">Roupeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-[10px]">Largura (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.width}
                  onChange={(e) => setDims("width", Number(e.target.value))} /></div>
              <div><Label className="text-[10px]">Altura (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.height}
                  onChange={(e) => setDims("height", Number(e.target.value))} /></div>
              <div><Label className="text-[10px]">Profundidade (mm)</Label>
                <Input type="number" className="tabular" value={config.dims.depth}
                  onChange={(e) => setDims("depth", Number(e.target.value))} /></div>
            </div>
            {!formValido && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs">Configuração inválida</AlertTitle>
                <AlertDescription className="text-[11px] space-y-0.5">
                  {semColunas && <div>• Adiciona pelo menos uma coluna.</div>}
                  {!larguraOK && !semColunas && (
                    <div>• Larguras: {Math.round(totalLarg)} / {Math.round(ci.larguraInterna)} mm (Δ {deltaLarg > 0 ? "+" : ""}{Math.round(deltaLarg)} mm).</div>
                  )}
                  {colsAbaixoMin.length > 0 && (
                    <div>• Coluna(s) {colsAbaixoMin.map((c) => c.i + 1).join(", ")} &lt; {MIN_COL_MM} mm.</div>
                  )}
                  {colsAltInvalidas.map((a) => (
                    <div key={a.i}>
                      • Col {a.i + 1}: {a.vazia ? "sem secções" : `altura ${Math.round(a.total)} / ${Math.round(alturaInterna)} mm (Δ ${a.delta > 0 ? "+" : ""}${Math.round(a.delta)} mm)`}.
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            {formValido && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Configuração válida
              </div>
            )}
            <Button onClick={onSave} disabled={upsert.isPending || !formValido} className="w-full">
              <Save className="mr-2 h-4 w-4" /> Guardar na biblioteca
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sistema de portas (global)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={doorMode} onValueChange={(v) => aplicarDoorMode(v as DoorMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem portas (aberto / mesclar)</SelectItem>
                <SelectItem value="batente">Portas batente por secção</SelectItem>
                <SelectItem value="correr">Portas de correr globais</SelectItem>
              </SelectContent>
            </Select>
            {doorMode === "correr" && cr && (
              <div className="space-y-3 rounded border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Nº folhas</Label>
                    <Select value={String(cr.nFolhas)} onValueChange={(v) => setCr({ nFolhas: Number(v) as 2 | 3 | 4 })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">Espelho</Label>
                    <Select value={cr.espelho} onValueChange={(v) => setCr({ espelho: v as EspelhoModo })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Sem espelho</SelectItem>
                        <SelectItem value="todas">Todas as folhas</SelectItem>
                        <SelectItem value="alternadas">Alternadas</SelectItem>
                        <SelectItem value="apenas_uma">Apenas uma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Deslizar folhas ({Math.round(drawerPct * 100)}%)</Label>
                  <Slider value={[drawerPct]} min={0} max={1} step={0.01} onValueChange={([v]) => setDrawerPct(v)} />
                </div>
              </div>
            )}
            {doorMode === "batente" && (
              <div className="space-y-1">
                <Label className="text-[10px]">Abertura ({Math.round(doorAngle)}°)</Label>
                <Slider value={[doorAngle]} min={0} max={110} step={1} onValueChange={([v]) => setDoorAngle(v)} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Columns3 className="h-4 w-4" />
              <CardTitle className="text-sm">Colunas (esq → dir)</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7" onClick={autoLarguras} title="Distribuir larguras igualmente">
                <Scale className="mr-1 h-3.5 w-3.5" /> Auto
              </Button>
              <Button size="sm" variant="outline" className="h-7" onClick={addColuna}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Coluna
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Largura interna:</span>
              <span className="tabular">{Math.round(ci.larguraInterna)} mm</span>
              <span className="text-muted-foreground">· Soma colunas + divisórias:</span>
              <span className={`tabular ${larguraOK ? "text-emerald-600" : "text-destructive"}`}>{Math.round(totalLarg)} mm</span>
            </div>
            <div className="space-y-1">
              {colunas.map((c, i) => {
                const wBad = c.largura_mm < MIN_COL_MM;
                const altBad = !alturasPorCol[i]?.ok || alturasPorCol[i]?.vazia;
                return (
                <div key={c.id}
                  className={`flex items-center gap-2 rounded border p-2 ${i === activeCol ? "border-primary bg-muted/40" : ""} ${altBad ? "border-destructive/60" : ""}`}>
                  <Button size="sm" variant={i === activeCol ? "default" : "ghost"} className="h-7 px-2 text-xs"
                    onClick={() => setActiveCol(i)}>Col {i + 1}</Button>
                  <div className="flex-1">
                    <Input type="number" min={MIN_COL_MM}
                      className={`tabular h-8 ${wBad ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      value={c.largura_mm}
                      title={wBad ? `Mínimo ${MIN_COL_MM} mm` : undefined}
                      onChange={(e) => updColuna(i, { largura_mm: Math.max(MIN_COL_MM / 2, Number(e.target.value) || MIN_COL_MM) })} />
                  </div>
                  <span className={`text-[10px] ${altBad ? "text-destructive" : "text-muted-foreground"}`}>{c.secoes?.length ?? 0} secç.</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveColuna(i, -1)} disabled={i === 0}><ArrowLeft className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveColuna(i, +1)} disabled={i === colunas.length - 1}><ArrowRight className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeColuna(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
                );
              })}
              {colunas.length === 0 && (
                <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Sem colunas. Adiciona pelo menos uma.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {col && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Secções da Col {activeCol + 1} (baixo → cima)</CardTitle>
              <Button size="sm" variant="ghost" className="h-7" onClick={autoAlturas} title="Distribuir alturas igualmente">
                <Scale className="mr-1 h-3.5 w-3.5" /> Auto
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Altura interna:</span>
                <span className="tabular">{Math.round(alturaInterna)} mm</span>
                <span className="text-muted-foreground">· Soma:</span>
                <span className={`tabular ${alturaOK ? "text-emerald-600" : "text-destructive"}`}>{Math.round(totalAlt)} mm</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(["varao", "maleiro_aberto", "maleiro_fechado", "porta", "gavetas", "nicho_aberto"] as SecaoTipo[]).map((t) => (
                  <Button key={t} variant="outline" size="sm" className="h-8 justify-start text-xs" onClick={() => addSecao(t)}>
                    <Plus className="mr-1 h-3 w-3" /> {SECAO_LABEL[t].split(" ")[0]}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {secoes.map((s, i) => (
                  <div key={s.id} className="space-y-2 rounded border p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">#{i + 1} (de baixo) — {SECAO_LABEL[s.tipo]}</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSecao(s.id, -1)} disabled={i === 0}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveSecao(s.id, +1)} disabled={i === secoes.length - 1}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSecao(s.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Altura (mm)</Label>
                        <Input type="number" min={MIN_SEC_MM}
                          className={`tabular h-8 ${s.altura_mm < MIN_SEC_MM ? "border-destructive focus-visible:ring-destructive" : ""}`}
                          value={s.altura_mm}
                          title={s.altura_mm < MIN_SEC_MM ? `Mínimo ${MIN_SEC_MM} mm` : undefined}
                          onChange={(e) => updSecao(s.id, { altura_mm: Math.max(MIN_SEC_MM, Number(e.target.value) || MIN_SEC_MM) })} />
                      </div>
                      <div><Label className="text-[10px]">Tipo</Label>
                        <Select value={s.tipo} onValueChange={(v) => updSecao(s.id, { tipo: v as SecaoTipo, config: {} })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(SECAO_LABEL).map(([k, label]) => (
                              <SelectItem key={k} value={k}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {s.tipo === "nicho_aberto" && (
                      <div><Label className="text-[10px]">Prateleiras móveis</Label>
                        <Input type="number" min={0} max={10} className="tabular h-8"
                          value={(s.config as any)?.prateleirasMoveis ?? 0}
                          onChange={(e) => updSecaoCfg(s.id, { prateleirasMoveis: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} />
                      </div>
                    )}
                    {s.tipo === "varao" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[10px]">Recuo topo varão (mm)</Label>
                          <Input type="number" className="tabular h-8"
                            value={(s.config as any)?.recuoTopoVarao_mm ?? 40}
                            onChange={(e) => updSecaoCfg(s.id, { recuoTopoVarao_mm: Math.max(20, Number(e.target.value) || 40) })} />
                        </div>
                        <div className="flex items-end gap-2">
                          <Switch checked={!!(s.config as any)?.prateleiraSuperior}
                            onCheckedChange={(v) => updSecaoCfg(s.id, { prateleiraSuperior: v })} />
                          <Label className="text-[10px]">Prateleira superior</Label>
                        </div>
                      </div>
                    )}
                    {(s.tipo === "maleiro_aberto" || s.tipo === "maleiro_fechado") && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[10px]">Nº prateleiras</Label>
                          <Input type="number" min={1} max={6} className="tabular h-8"
                            value={(s.config as any)?.nPrateleiras ?? 1}
                            onChange={(e) => updSecaoCfg(s.id, { nPrateleiras: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })} />
                        </div>
                        {s.tipo === "maleiro_fechado" && (
                          <div><Label className="text-[10px]">Nº portas</Label>
                            <Select value={String((s.config as any)?.nPortas ?? 2)} onValueChange={(v) => updSecaoCfg(s.id, { nPortas: Number(v) })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 porta</SelectItem>
                                <SelectItem value="2">2 portas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                    {s.tipo === "porta" && (
                      <div><Label className="text-[10px]">Nº portas (batente)</Label>
                        <Select value={String((s.config as any)?.nPortas ?? 2)} onValueChange={(v) => updSecaoCfg(s.id, { nPortas: Number(v) })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 porta</SelectItem>
                            <SelectItem value="2">2 portas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {s.tipo === "gavetas" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-[10px]">Nº gavetas</Label>
                          <Input type="number" min={1} max={10} className="tabular h-8"
                            value={(s.config as any)?.nGavetas ?? 3}
                            onChange={(e) => updSecaoCfg(s.id, { nGavetas: Math.max(1, Math.min(10, Number(e.target.value) || 3)) })} />
                        </div>
                        <div className="flex items-end gap-2">
                          <Switch checked={!!(s.config as any)?.interno}
                            onCheckedChange={(v) => updSecaoCfg(s.id, { interno: v })} />
                          <Label className="text-[10px]">Interno (atrás de porta)</Label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {secoes.length === 0 && (
                  <div className="rounded border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Sem secções. Adiciona pelo menos uma.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="min-h-[600px] rounded border bg-muted/20">
        <Module3D config={config} doorAngleDeg={doorAngle} drawerPct={drawerPct} showHardware={false} />
      </div>
    </div>
  );
}
