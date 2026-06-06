import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/ferragens")({
  component: () => (
    <PlaceholderPage
      title="Ferragens"
      description="Minifix, cavilhas, dobradiças, corrediças, pés e perfis."
    />
  ),
});
