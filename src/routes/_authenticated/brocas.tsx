import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/brocas")({
  component: () => (
    <PlaceholderPage
      title="Brocas"
      description="Diâmetros e profundidades para furação."
    />
  ),
});
