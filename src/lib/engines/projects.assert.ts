import { projectUpsertSchema } from "@/lib/projects.functions";

export function runProjectsAsserts() {
  // Schema accepts client fields
  const ok = projectUpsertSchema.safeParse({
    name: "Casa do João",
    type: "cozinha",
    status: "rascunho",
    cliente_nome: "João Silva",
    cliente_nif: "123456789",
    cliente_morada: "Rua A, 1",
  });
  console.assert(ok.success, "[projects] upsert schema aceita cliente_*");

  // Required name
  const bad = projectUpsertSchema.safeParse({ name: "" });
  console.assert(!bad.success, "[projects] name vazio rejeitado");

  // Active project id nullable
  const nullable = projectUpsertSchema.safeParse({ name: "X" });
  console.assert(nullable.success, "[projects] cliente_* opcionais");
}
