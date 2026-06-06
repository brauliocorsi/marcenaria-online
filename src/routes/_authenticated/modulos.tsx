import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Box, Save, Trash2, Plus, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { Module3D } from "@/components/viewer/Module3D";
import { Switch } from "@/components/ui/switch";
import { listMaterials, listHardware } from "@/lib/catalog.functions";
import { listModules, upsertModule, deleteModule } from "@/lib/modules.functions";
import { getDefaultTemplate, DEFAULT_TEMPLATE_CONFIG, type TemplateConfig } from "@/lib/drilling.functions";
import { calcularPecas, dimensoesGavetas, DEFAULT_MODULE_CONFIG, normalizarConfig, type ModuleConfig, type Veio, type CorredicaTipo } from "@/lib/engines/module";
import { calcularFuros, calcularDobradicas, calcularCorredicas, type Furo, type TipoFuro } from "@/lib/engines/drilling";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/modulos")({ component: ModulosPage });

const VEIO_LABEL: Record<Veio, string> = { comprimento: "Comprimento", largura: "Largura", sem: "Sem veio" };

function ModulosPage() {
  const qc = useQueryClient();
  const fetchModules = useServerFn(listModules);
  const fetchMaterials = useServerFn(listMaterials);
  const fetchHardware = useServerFn(listHardware);
  const fetchDefaultTemplate = useServerFn(getDefaultTemplate);
  const save = useServerFn(upsertModule);
  const del = useServerFn(deleteModule);

  const { data: modules } = useQuery({ queryKey: ["modules"], queryFn: () => fetchModules() });
  const { data: materials } = useQuery({ queryKey: ["materials"], queryFn: () => fetchMaterials() });
  const { data: hardware } = useQuery({ queryKey: ["hardware"], queryFn: () => fetchHardware() });
  const { data: defaultTpl } = useQuery({ queryKey: ["drilling-templates", "default"], queryFn: () => fetchDefaultTemplate() });
  const corredicas = useMemo(() => (hardware ?? []).filter((h: any) => h.category === "corredica"), [hardware]);

  const [name, setName] = useState("Módulo sem nome");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [config, setConfig] = useState<ModuleConfig>(DEFAULT_MODULE_CONFIG);
  const [showOverrides, setShowOverrides] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [explode, setExplode] = useState(0);
  const [viewTab, setViewTab] = useState<"3d" | "pecas" | "furacao">("3d");
  const [showFuros, setShowFuros] = useState(true);


  const pecas = useMemo(() => {
    try { return calcularPecas(config); } catch { return []; }
  }, [config]);

  const invalid = useMemo(() => pecas.some((p) => p.comprimento_mm <= 0 || p.largura_mm <= 0), [pecas]);

  const templateConfig: TemplateConfig | null = useMemo(() => {
    if (!defaultTpl) return null;
    return { ...DEFAULT_TEMPLATE_CONFIG, ...(defaultTpl.config as any) };
  }, [defaultTpl]);

  const furos: Furo[] = useMemo(() => {
    if (!templateConfig || invalid) return [];
    try {
      return [
        ...calcularFuros(config, templateConfig),
        ...calcularDobradicas(config, templateConfig),
        ...calcularCorredicas(config, templateConfig),
      ];
    } catch { return []; }
  }, [config, templateConfig, invalid]);

  const totals = useMemo(() => {
    const qtd = pecas.reduce((a, p) => a + p.qtd, 0);
    const areaM2 = pecas.reduce((a, p) => a + (p.qtd * p.comprimento_mm * p.largura_mm) / 1_000_000, 0);
    return { qtd, areaM2 };
  }, [pecas]);

  function loadModule(m: any) {
    setEditingId(m.id);
    setName(m.name);
    setMaterialId(m.material_id ?? null);
    const cfg = (m.config && Object.keys(m.config).length > 0)
      ? { ...DEFAULT_MODULE_CONFIG, ...m.config,
          dims: { width: m.width_mm, height: m.height_mm, depth: m.depth_mm } }
      : { ...DEFAULT_MODULE_CONFIG, dims: { width: m.width_mm, height: m.height_mm, depth: m.depth_mm } };
    setConfig(normalizarConfig(cfg as ModuleConfig));
  }

  function novoModulo() {
    setEditingId(null);
    setName("Módulo sem nome");
    setMaterialId(null);
    setConfig(DEFAULT_MODULE_CONFIG);
  }

  const saveMut = useMutation({
    mutationFn: async () => save({ data: {
      id: editingId ?? undefined,
      name, width_mm: config.dims.width, height_mm: config.dims.height, depth_mm: config.dims.depth,
      config: config as any, pieces: pecas as any, material_id: materialId,
    } }),
    onSuccess: (row: any) => {
      toast.success(editingId ? "Módulo atualizado" : "Módulo guardado");
      setEditingId(row.id);
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: Error) => toast.error("Erro ao guardar", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Módulo apagado");
      if (editingId === delId) novoModulo();
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["modules"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  // updater helpers
  const upd = <K extends keyof ModuleConfig>(k: K, v: ModuleConfig[K]) => setConfig((c) => ({ ...c, [k]: v }));
  const updDim = (k: keyof ModuleConfig["dims"], v: number) => setConfig((c) => ({ ...c, dims: { ...c.dims, [k]: Math.round(v) } }));
  const updFolga = (k: keyof ModuleConfig["folgas"], v: number) => setConfig((c) => ({ ...c, folgas: { ...c.folgas, [k]: v } }));
  const updFundo = <K extends keyof ModuleConfig["fundo"]>(k: K, v: ModuleConfig["fundo"][K]) => setConfig((c) => ({ ...c, fundo: { ...c.fundo, [k]: v } }));
  const updPorta = <K extends keyof ModuleConfig["portas"]>(k: K, v: ModuleConfig["portas"][K]) => setConfig((c) => ({ ...c, portas: { ...c.portas, [k]: v } }));
  const updGav = <K extends keyof ModuleConfig["gavetas"]>(k: K, v: ModuleConfig["gavetas"][K]) => setConfig((c) => ({ ...c, gavetas: { ...c.gavetas, [k]: v } }));
  const updGavCorr = <K extends keyof ModuleConfig["gavetas"]["corredica"]>(k: K, v: ModuleConfig["gavetas"]["corredica"][K]) => setConfig((c) => ({ ...c, gavetas: { ...c.gavetas, corredica: { ...c.gavetas.corredica, [k]: v } } }));
  const updPes = <K extends keyof ModuleConfig["pes"]>(k: K, v: ModuleConfig["pes"][K]) => setConfig((c) => ({ ...c, pes: { ...c.pes, [k]: v } }));
  const updTamp = <K extends keyof ModuleConfig["tamponamento"]>(k: K, v: ModuleConfig["tamponamento"][K]) => setConfig((c) => ({ ...c, tamponamento: { ...c.tamponamento, [k]: v } }));
  const updEsp = (k: keyof ModuleConfig["espessuras"], v: number | null) => setConfig((c) => ({ ...c, espessuras: { ...c.espessuras, [k]: v } }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Módulos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bancada paramétrica — recálculo instantâneo das peças.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={novoModulo}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || invalid}>
            <Save className="mr-2 h-4 w-4" /> {saveMut.isPending ? "A guardar…" : "Guardar módulo"}
          </Button>
        </div>
      </div>

      {/* Saved modules strip */}
      {modules && modules.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {modules.map((m: any) => (
            <button
              key={m.id}
              onClick={() => loadModule(m)}
              className={cn(
                "group flex min-w-[180px] items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left shadow-sm transition hover:border-primary/50",
                editingId === m.id && "border-primary ring-1 ring-primary/30"
              )}
            >
              <Box className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.name}</div>
                <div className="text-[11px] text-muted-foreground tabular">{m.width_mm}×{m.height_mm}×{m.depth_mm} mm</div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setDelId(m.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10"
                aria-label="Apagar módulo"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ─────────── LEFT: Configuration ─────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader>
            <CardContent>
              <Label htmlFor="modname">Nome do módulo</Label>
              <Input id="modname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Dimensões externas (mm)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DimRow label="Largura" value={config.dims.width} min={100} max={3000} onChange={(v) => updDim("width", v)} />
              <DimRow label="Altura" value={config.dims.height} min={100} max={3000} onChange={(v) => updDim("height", v)} />
              <DimRow label="Profundidade" value={config.dims.depth} min={100} max={1200} onChange={(v) => updDim("depth", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Construção</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Sistema de montagem</Label>
                <Select value={config.sistemaMontagem} onValueChange={(v) => upd("sistemaMontagem", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laterais_cobrem">Laterais cobrem topo/base</SelectItem>
                    <SelectItem value="tampo_base_cobrem">Topo/base cobrem laterais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Material</Label>
                <Select value={materialId ?? "__none__"} onValueChange={(v) => setMaterialId(v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Sem material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— sem material —</SelectItem>
                    {(materials ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · {m.thickness_mm}mm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Espessuras (mm)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Espessura padrão</Label>
                <Input type="number" min={1} step={1} className="tabular"
                  value={config.espessuraPadrao}
                  onChange={(e) => upd("espessuraPadrao", Math.max(1, Number(e.target.value) || 1))} />
              </div>
              <button type="button" onClick={() => setShowOverrides((s) => !s)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {showOverrides ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Ajustar por peça
              </button>
              {showOverrides && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(["lateral", "tampo", "base", "prateleira"] as const).map((k) => (
                    <div key={k} className="space-y-1">
                      <Label className="text-xs capitalize">{k}</Label>
                      <Input type="number" min={0} step={1} placeholder={`${config.espessuraPadrao}`} className="tabular"
                        value={config.espessuras[k] ?? ""}
                        onChange={(e) => updEsp(k, e.target.value === "" ? null : Number(e.target.value))} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Prateleiras</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Quantidade</Label>
                <Input type="number" min={0} step={1} className="tabular"
                  value={config.nPrateleiras}
                  onChange={(e) => upd("nPrateleiras", Math.max(0, Number(e.target.value) || 0))} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Folga lateral</Label>
                <Input type="number" min={0} step={0.5} className="tabular"
                  value={config.folgas.prateleira_lateral}
                  onChange={(e) => updFolga("prateleira_lateral", Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Recuo frontal</Label>
                <Input type="number" min={0} step={1} className="tabular"
                  value={config.folgas.prateleira_recuo}
                  onChange={(e) => updFolga("prateleira_recuo", Number(e.target.value) || 0)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Fundo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Modo</Label>
                  <Select value={config.fundo.modo} onValueChange={(v) => updFundo("modo", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobreposto">Sobreposto</SelectItem>
                      <SelectItem value="ranhura">Em ranhura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Espessura</Label>
                  <Input type="number" min={1} step={0.5} className="tabular"
                    value={config.fundo.espessura}
                    onChange={(e) => updFundo("espessura", Math.max(1, Number(e.target.value) || 1))} />
                </div>
              </div>
              {config.fundo.modo === "ranhura" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Prof. ranhura</Label>
                    <Input type="number" min={0} step={0.5} className="tabular"
                      value={config.fundo.prof_ranhura}
                      onChange={(e) => updFundo("prof_ranhura", Number(e.target.value) || 0)} />
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Recuo</Label>
                    <Input type="number" min={0} step={1} className="tabular"
                      value={config.fundo.recuo}
                      onChange={(e) => updFundo("recuo", Number(e.target.value) || 0)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Portas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nº de portas</Label>
                  <Select value={String(config.portas.nPortas)} onValueChange={(v) => updPorta("nPortas", Number(v) as 0 | 1 | 2)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sem portas</SelectItem>
                      <SelectItem value="1">1 porta</SelectItem>
                      <SelectItem value="2">2 portas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Modo</Label>
                  <Select value={config.portas.modo} onValueChange={(v) => updPorta("modo", v as any)} disabled={config.portas.nPortas === 0}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobreposta">Sobreposta</SelectItem>
                      <SelectItem value="embutida">Embutida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {config.portas.nPortas === 1 && (
                <div className="space-y-1"><Label className="text-xs">Lado de abertura (puxador)</Label>
                  <Select value={config.portas.ladoAbertura} onValueChange={(v) => updPorta("ladoAbertura", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esquerda">Esquerda (dobradiças à direita)</SelectItem>
                      <SelectItem value="direita">Direita (dobradiças à esquerda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Espessura</Label>
                  <Input type="number" min={0} step={1} placeholder={`${config.espessuraPadrao}`} className="tabular"
                    value={config.portas.espessura ?? ""}
                    disabled={config.portas.nPortas === 0}
                    onChange={(e) => updPorta("espessura", e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Folga</Label>
                  <Input type="number" min={0} step={0.5} className="tabular"
                    value={config.portas.folga}
                    disabled={config.portas.nPortas === 0}
                    onChange={(e) => updPorta("folga", Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Folga central</Label>
                  <Input type="number" min={0} step={0.5} className="tabular"
                    value={config.portas.folgaCentral}
                    disabled={config.portas.nPortas !== 2}
                    onChange={(e) => updPorta("folgaCentral", Number(e.target.value) || 0)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Gavetas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.gavetas.nGavetas > 0 && config.portas.nPortas > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                  Regra: módulo é portas <em>OU</em> gavetas. Como há gavetas, as portas são ignoradas.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Nº de gavetas</Label>
                  <Input type="number" min={0} max={10} step={1} className="tabular"
                    value={config.gavetas.nGavetas}
                    onChange={(e) => updGav("nGavetas", Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Modo</Label>
                  <Select value={config.gavetas.modo} onValueChange={(v) => updGav("modo", v as any)} disabled={config.gavetas.nGavetas === 0}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobreposta">Sobreposta</SelectItem>
                      <SelectItem value="embutida">Embutida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Folga</Label>
                  <Input type="number" min={0} step={0.5} className="tabular"
                    value={config.gavetas.folga} disabled={config.gavetas.nGavetas === 0}
                    onChange={(e) => updGav("folga", Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Esp. frente</Label>
                  <Input type="number" min={1} step={0.5} className="tabular"
                    value={config.gavetas.espessuraFrente} disabled={config.gavetas.nGavetas === 0}
                    onChange={(e) => updGav("espessuraFrente", Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Esp. caixa</Label>
                  <Input type="number" min={1} step={0.5} className="tabular"
                    value={config.gavetas.espessuraCaixa} disabled={config.gavetas.nGavetas === 0}
                    onChange={(e) => updGav("espessuraCaixa", Math.max(1, Number(e.target.value) || 1))} />
                </div>
              </div>
              {(() => {
                const corrSel = corredicas.find((c: any) => c.id === config.gavetas.corredica.hardwareId);
                const comprimentos: number[] = (corrSel?.params as any)?.comprimentosDisponiveis ?? [];
                const flEfetiva = config.gavetas.corredica.folgaLateralPorLado ?? 13;
                const cxPreview = config.gavetas.nGavetas > 0 ? dimensoesGavetas(config).caixas[0] : null;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Corrediça</Label>
                        <Select
                          value={config.gavetas.corredica.hardwareId ?? "__none__"}
                          disabled={config.gavetas.nGavetas === 0}
                          onValueChange={(v) => {
                            if (v === "__none__") {
                              setConfig((c) => ({ ...c, gavetas: { ...c.gavetas, corredica: { hardwareId: null, comprimento: c.gavetas.corredica.comprimento } } }));
                              return;
                            }
                            const h = corredicas.find((x: any) => x.id === v);
                            if (!h) return;
                            const p: any = h.params ?? {};
                            const comps: number[] = Array.isArray(p.comprimentosDisponiveis) ? p.comprimentosDisponiveis : [];
                            const cur = config.gavetas.corredica.comprimento;
                            const comp = comps.includes(cur) ? cur : (comps[Math.floor(comps.length / 2)] ?? cur);
                            setConfig((c) => ({ ...c, gavetas: { ...c.gavetas, corredica: {
                              hardwareId: v, comprimento: comp,
                              folgaLateralPorLado: typeof p.folgaLateralPorLado === "number" ? p.folgaLateralPorLado : 13,
                              tipo: p.tipo as CorredicaTipo | undefined,
                              rebaixoFundo: !!p.rebaixoFundo,
                            } } }));
                          }}>
                          <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— nenhuma —</SelectItem>
                            {corredicas.map((h: any) => (
                              <SelectItem key={h.id} value={h.id}>{h.name} {h.params?.tipo ? `· ${h.params.tipo}` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Comprimento (mm)</Label>
                        <Select
                          value={String(config.gavetas.corredica.comprimento)}
                          disabled={config.gavetas.nGavetas === 0 || comprimentos.length === 0}
                          onValueChange={(v) => setConfig((c) => ({ ...c, gavetas: { ...c.gavetas, corredica: { ...c.gavetas.corredica, comprimento: Number(v) } } }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {comprimentos.map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} mm</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Folga caixa (vertical)</Label>
                        <Input type="number" min={0} step={1} className="tabular"
                          value={config.gavetas.alturaCaixaFolga} disabled={config.gavetas.nGavetas === 0}
                          onChange={(e) => updGav("alturaCaixaFolga", Number(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Folga lateral (por lado)</Label>
                        <div className="h-9 rounded-md border bg-muted/30 px-3 flex items-center text-sm tabular">
                          {flEfetiva} mm <span className="ml-1.5 text-[10px] text-muted-foreground">(da corrediça)</span>
                        </div>
                      </div>
                    </div>
                    {config.gavetas.nGavetas > 0 && !corrSel && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                        Selecione uma corrediça. Sem seleção, está a usar a folga padrão de 13 mm.
                      </div>
                    )}
                    {cxPreview && (
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground tabular">
                        Caixa calculada: <span className="text-foreground">{cxPreview.boxWidth}</span> × <span className="text-foreground">{cxPreview.boxHeight}</span> × <span className="text-foreground">{cxPreview.boxDepth}</span> mm
                        {cxPreview.requerRasgoTraseira && <span className="ml-2 text-amber-700">· requer rasgo na traseira (TODO)</span>}
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Pés</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="pes-on" className="text-xs">Ativos</Label>
                <Switch id="pes-on" checked={config.pes.ativo} onCheckedChange={(v) => updPes("ativo", v)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Altura</Label>
                  <Input type="number" min={10} step={1} className="tabular"
                    value={config.pes.altura} disabled={!config.pes.ativo}
                    onChange={(e) => updPes("altura", Math.max(10, Number(e.target.value) || 10))} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Quantidade</Label>
                  <Select value={String(config.pes.quantidade)} disabled={!config.pes.ativo}
                    onValueChange={(v) => updPes("quantidade", Number(v) as 4 | 6)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 pés</SelectItem>
                      <SelectItem value="6">6 pés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Recuo</Label>
                  <Input type="number" min={0} step={1} className="tabular"
                    value={config.pes.recuo} disabled={!config.pes.ativo}
                    onChange={(e) => updPes("recuo", Math.max(0, Number(e.target.value) || 0))} />
                </div>
              </div>
              {config.pes.ativo && config.dims.width > 1200 && config.pes.quantidade === 4 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                  Sugerido: 6 pés para esta largura ({config.dims.width} mm).
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Acabamentos · Tamponamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {(["esquerda", "direita", "topo"] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor={`tamp-${k}`} className="text-xs capitalize">{k}</Label>
                    <Switch id={`tamp-${k}`} checked={config.tamponamento[k]} onCheckedChange={(v) => updTamp(k, v)} />
                  </div>
                ))}
              </div>
              <div className="space-y-1"><Label className="text-xs">Espessura</Label>
                <Input type="number" min={1} step={0.5} placeholder={`${config.espessuraPadrao}`} className="tabular"
                  value={config.tamponamento.espessura ?? ""}
                  onChange={(e) => updTamp("espessura", e.target.value === "" ? null : Math.max(1, Number(e.target.value) || 1))} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─────────── RIGHT: Vista 3D / Peças (Tabs) ─────────── */}
        <div className="space-y-3">
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "3d" | "pecas" | "furacao")}>
            <div className="flex items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="3d">Vista 3D</TabsTrigger>
                <TabsTrigger value="pecas">Peças</TabsTrigger>
                <TabsTrigger value="furacao">Furação</TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground tabular">
                {totals.qtd} peças · {totals.areaM2.toFixed(3)} m² {templateConfig ? `· ${furos.length} furos` : ""}
              </div>
            </div>

            <TabsContent value="3d" className="mt-3">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5">
                  <Label className="text-xs text-muted-foreground shrink-0">Vista explodida</Label>
                  <Slider
                    value={[Math.round(explode * 100)]}
                    min={0} max={100} step={1}
                    onValueChange={([v]) => setExplode(v / 100)}
                    className="flex-1 min-w-[120px]"
                  />
                  <span className="text-xs tabular w-10 text-right text-muted-foreground">{Math.round(explode * 100)}%</span>
                  <div className="flex items-center gap-2 pl-3 border-l">
                    <Switch id="show-furos" checked={showFuros} onCheckedChange={setShowFuros} disabled={!templateConfig} />
                    <Label htmlFor="show-furos" className="text-xs text-muted-foreground cursor-pointer">Mostrar furação</Label>
                  </div>
                </div>
                {invalid && (
                  <div className="flex items-start gap-2 border-b bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Dimensões inválidas — algumas peças têm tamanho ≤ 0.</span>
                  </div>
                )}
                <div className="h-[560px] w-full">
                  <Module3D config={config} explode={explode} furos={showFuros ? furos : []} />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="pecas" className="mt-3">
              <Card className="overflow-hidden">
                {invalid && (
                  <div className="flex items-start gap-2 border-b bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Dimensões inválidas — algumas peças têm tamanho ≤ 0. Aumente as dimensões externas ou reduza as espessuras/folgas.</span>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Comprimento</TableHead>
                      <TableHead className="text-right">Largura</TableHead>
                      <TableHead className="text-right">Espessura</TableHead>
                      <TableHead>Veio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pecas.map((p, i) => (
                      <TableRow key={i} className={cn((p.comprimento_mm <= 0 || p.largura_mm <= 0) && "bg-destructive/5")}>
                        <TableCell className="font-medium">{p.descricao}</TableCell>
                        <TableCell className="text-right tabular">{p.qtd}</TableCell>
                        <TableCell className="text-right tabular">{p.comprimento_mm} mm</TableCell>
                        <TableCell className="text-right tabular">{p.largura_mm} mm</TableCell>
                        <TableCell className="text-right tabular">{p.espessura_mm} mm</TableCell>
                        <TableCell className="text-muted-foreground">{VEIO_LABEL[p.veio]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="furacao" className="mt-3">
              <FuracaoPanel furos={furos} hasTemplate={!!templateConfig} />
            </TabsContent>
          </Tabs>
        </div>


      </div>

      <ConfirmDelete open={!!delId} onOpenChange={(o) => !o && setDelId(null)} onConfirm={() => delId && delMut.mutate(delId)} />
    </div>
  );
}

function DimRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  return (
    <div className="grid grid-cols-[80px_1fr_96px] items-center gap-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([v]) => onChange(v)} />
      <Input
        type="number" min={min} max={max} step={1} className="tabular h-8"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => setLocal(String(value))}
      />
    </div>
  );
}

const TIPO_LABEL: Record<TipoFuro, string> = {
  cavilha: "Cavilha",
  minifix_corpo: "Minifix (corpo)",
  minifix_perno: "Minifix (perno)",
  parafuso: "Parafuso",
  dobradica: "Dobradiça (caneco)",
};

function FuracaoPanel({ furos, hasTemplate }: { furos: Furo[]; hasTemplate: boolean }) {
  if (!hasTemplate) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-5 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Sem template de furação padrão.</div>
            <div className="text-muted-foreground mt-1">
              Defina um template de furação padrão em <span className="font-medium">Templates de Furação</span> para gerar a furação automaticamente.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // agrupar por peca + tipo_furo + diametro
  const grupos = new Map<string, { peca: string; tipo: TipoFuro; diametro: number; profundidade: number; n: number }>();
  for (const f of furos) {
    const k = `${f.peca}|${f.tipo_furo}|${f.diametro}|${f.profundidade}`;
    const g = grupos.get(k);
    if (g) g.n += 1;
    else grupos.set(k, { peca: f.peca, tipo: f.tipo_furo, diametro: f.diametro, profundidade: f.profundidade, n: 1 });
  }
  const rows = Array.from(grupos.values()).sort((a, b) => a.peca.localeCompare(b.peca) || a.tipo.localeCompare(b.tipo));

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-2.5 text-xs text-muted-foreground">
        Total de furos: <span className="text-foreground font-medium tabular">{furos.length}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Peça</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Ø (mm)</TableHead>
            <TableHead className="text-right">Prof. (mm)</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium capitalize">{r.peca}</TableCell>
              <TableCell>{TIPO_LABEL[r.tipo]}</TableCell>
              <TableCell className="text-right tabular">{r.diametro}</TableCell>
              <TableCell className="text-right tabular">{r.profundidade}</TableCell>
              <TableCell className="text-right tabular">{r.n}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

