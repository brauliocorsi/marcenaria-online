import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/materiais")({
  component: () => (
    <PlaceholderPage
      title="Materiais"
      description="Chapas, melaminas e orlas."
    />
  ),
});
