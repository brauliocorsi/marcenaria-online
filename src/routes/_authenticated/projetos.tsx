import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/projetos")({
  component: () => (
    <PlaceholderPage
      title="Projetos"
      description="Cozinhas modulares, roupeiros e móveis sob medida."
    />
  ),
});
