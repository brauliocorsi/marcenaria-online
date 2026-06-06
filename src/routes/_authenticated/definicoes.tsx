import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { ALLOWED_THICKNESSES_MM } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/definicoes")({
  component: DefinicoesPage,
});

function DefinicoesPage() {
  const router = useRouter();
  const fetchSettings = useServerFn(getSettings);
  const saveSettings = useServerFn(updateSettings);

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchSettings(),
  });

  const [currency, setCurrency] = useState("EUR");
  const [iva, setIva] = useState<string>("23");
  const [thickness, setThickness] = useState<string>("19");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setCurrency(data.currency ?? "EUR");
      setIva(String(data.iva_percent ?? 23));
      setThickness(String(data.default_thickness_mm ?? 19));
    }
  }, [data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ivaNum = parseInt(iva, 10);
    const thicknessNum = parseInt(thickness, 10);
    if (Number.isNaN(ivaNum) || ivaNum < 0 || ivaNum > 100) {
      toast.error("IVA inválido", { description: "Indique um valor entre 0 e 100." });
      return;
    }
    setSaving(true);
    try {
      await saveSettings({
        data: { currency, iva_percent: ivaNum, default_thickness_mm: thicknessNum },
      });
      toast.success("Definições guardadas");
      router.invalidate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Não foi possível guardar", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Erro ao carregar definições: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Definições</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuração global da conta. Aplicada por defeito a todos os projetos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <section className="space-y-1">
          <h2 className="text-sm font-semibold">Faturação</h2>
          <p className="text-xs text-muted-foreground">Moeda e taxa de IVA aplicada aos orçamentos.</p>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moeda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="iva">IVA</Label>
            <div className="relative">
              <Input
                id="iva"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={1}
                value={iva}
                onChange={(e) => setIva(e.target.value.replace(/\D/g, ""))}
                className="pr-10 tabular"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <section className="space-y-1">
          <h2 className="text-sm font-semibold">Produção</h2>
          <p className="text-xs text-muted-foreground">
            Valores por defeito usados em novos módulos. Todas as medidas em milímetros (mm).
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="thickness">Espessura padrão</Label>
            <Select value={thickness} onValueChange={setThickness}>
              <SelectTrigger id="thickness" className="tabular">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_THICKNESSES_MM.map((t) => (
                  <SelectItem key={t} value={String(t)} className="tabular">
                    {t} mm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
              milímetros (mm) · fixo
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar definições
          </Button>
        </div>
      </form>
    </div>
  );
}
