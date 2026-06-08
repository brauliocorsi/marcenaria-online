import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

if (import.meta.env.DEV && typeof window !== "undefined") {
  import("./lib/engines/module.assert").then((m) => m.runModuleAsserts()).catch(() => {});
  import("./lib/engines/drilling.assert").then((m) => m.runDrillingAsserts()).catch(() => {});
  import("./lib/engines/portas.assert").then((m) => m.runPortasAsserts()).catch(() => {});
  import("./lib/engines/gavetas.assert").then((m) => m.runGavetasAsserts()).catch(() => {});
  import("./lib/engines/pes-tamponamento.assert").then((m) => m.runPesTamponamentoAsserts()).catch(() => {});
  import("./lib/engines/hardware-anim.assert").then((m) => m.runHardwareAnimAsserts()).catch(() => {});
  import("./lib/engines/ambiente.assert").then((m) => m.runAmbienteAsserts()).catch(() => {});
  import("./lib/engines/gaveta-template").then((m) => m.runGavetaTemplateAsserts()).catch(() => {});
  import("./lib/engines/ambiente-modulos.assert").then((m) => m.runAmbienteModulosAsserts()).catch(() => {});
  import("./lib/engines/puxadores").then((m) => m.runPuxadoresAsserts()).catch(() => {});
  import("./lib/engines/presets-cozinha").then((m) => m.runPresetsCozinhaAsserts()).catch(() => {});
  import("./lib/engines/projects.assert").then((m) => m.runProjectsAsserts()).catch(() => {});
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
