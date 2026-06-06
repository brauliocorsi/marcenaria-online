import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/templates-furacao")({
  component: () => (
    <PlaceholderPage
      title="Templates de Furação"
      description="Configurações reutilizáveis para furação automática."
    />
  ),
});
