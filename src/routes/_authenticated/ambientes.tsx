import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2, Home, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete } from "@/components/catalog/ConfirmDelete";
import { Room3D } from "@/components/viewer/Room3D";
import { listAmbientes, upsertAmbiente, deleteAmbiente } from "@/lib/ambientes.functions";
import {
  DEFAULT_ROOM, normalizarRoom, validarAbertura, comprimentoParede,
  type RoomConfig, type ParedeId, type Abertura, type TipoAbertura,
} from "@/lib/engines/ambiente";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/ambientes")({ component: AmbientesPage });

const PAREDES: { id: ParedeId; label: string }[] = [
  { id: "fundo", label: "Fundo" },
  { id: "frente", label: "Frente" },
  { id: "esquerda", label: "Esquerda" },
  { id: "direita", label: "Direita" },
];

function AmbientesPage() {
  const qc = useQueryClient();
  const fetchAmbientes = useServerFn(listAmbientes);
  const save = useServerFn(upsertAmbiente);
  const del = useServerFn(deleteAmbiente);

  const { data: ambientes } = useQuery({ queryKey: ["ambientes"], queryFn: () => fetchAmbientes() });

  const [name, setName] = useState("Ambiente sem nome");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomConfig>(DEFAULT_ROOM);
  const [delId, setDelId] = useState<string | null>(null);

  function loadAmbiente(a: any) {
    setEditingId(a.id);
    setName(a.name);
    setRoom(normalizarRoom(a.config));
  }

  function novo() {
    setEditingId(null);
    setName("Ambiente sem nome");
    setRoom(DEFAULT_ROOM);
  }

  const saveMut = useMutation({
    mutationFn: async () => save({ data: { id: editingId ?? undefined, name, config: room } }),
    onSuccess: (row: any) => {
      toast.success(editingId ? "Ambiente atualizado" : "Ambiente guardado");
      setEditingId(row.id);
      qc.invalidateQueries({ queryKey: ["ambientes"] });
    },
    onError: (e: Error) => toast.error("Erro ao guardar", { description: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Ambiente apagado");
      if (editingId === delId) novo();
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["ambientes"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const updDim = (k: "largura" | "profundidade" | "altura" | "espessuraParede", v: number) =>
    setRoom((r) => ({ ...r, [k]: Math.round(v) }));

  const updParede = (id: ParedeId, v: boolean) =>
    setRoom((r) => ({ ...r, paredesVisiveis: { ...r.paredesVisiveis, [id]: v } }));

  function addAbertura(paredeId: ParedeId, tipo: TipoAbertura) {
    const nova: Abertura = {
      id: crypto.randomUUID(),
      paredeId, tipo,
      x: 100, y: tipo === "porta" ? 0 : 900,
      largura: tipo === "porta" ? 800 : 1200,
      altura: tipo === "porta" ? 2100 : 1000,
    };
    setRoom((r) => ({ ...r, aberturas: [...r.aberturas, nova] }));
  }

  function updAbertura(id: string, patch: Partial<Abertura>) {
    setRoom((r) => ({
      ...r,
      aberturas: r.aberturas.map((a) => a.id === id ? { ...a, ...patch, y: patch.tipo === "porta" ? 0 : (patch.y ?? a.y) } : a),
    }));
  }

  function removeAbertura(id: string) {
    setRoom((r) => ({ ...r, aberturas: r.aberturas.filter((a) => a.id !== id) }));
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ambientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Define a sala (paredes + chão) para depois colocar módulos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={novo}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <Save className="mr-2 h-4 w-4" /> {saveMut.isPending ? "A guardar…" : "Guardar ambiente"}
          </Button>
        </div>
      </div>

      {ambientes && ambientes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ambientes.map((a: any) => (
            <div
              key={a.id}
              className={cn(
                "group flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                editingId === a.id ? "border-primary bg-accent" : "border-border",
              )}
            >
              <button onClick={() => loadAmbiente(a)} className="px-1">
                <Home className="mr-1 inline h-3 w-3" /> {a.name}
              </button>
              <button
                onClick={() => setDelId(a.id)}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                aria-label="Apagar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Dimensões (mm)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SliderField label="Largura" value={room.largura} min={500} max={8000} step={10} onChange={(v) => updDim("largura", v)} />
              <SliderField label="Profundidade" value={room.profundidade} min={500} max={8000} step={10} onChange={(v) => updDim("profundidade", v)} />
              <SliderField label="Altura" value={room.altura} min={2000} max={3500} step={10} onChange={(v) => updDim("altura", v)} />
              <SliderField label="Espessura parede" value={room.espessuraParede} min={20} max={500} step={5} onChange={(v) => updDim("espessuraParede", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Paredes visíveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {PAREDES.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <Label htmlFor={`par-${p.id}`}>Mostrar {p.label.toLowerCase()}</Label>
                  <Switch
                    id={`par-${p.id}`}
                    checked={room.paredesVisiveis[p.id]}
                    onCheckedChange={(v) => updParede(p.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="h-[640px] w-full bg-muted">
            <Room3D room={room} />
          </div>
        </Card>
      </div>

      <ConfirmDelete open={!!delId} onOpenChange={(o) => !o && setDelId(null)} onConfirm={() => delId && delMut.mutate(delId)} />
    </div>
  );
}

function SliderField({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          className="h-7 w-24 text-right text-xs"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
