import { Link, useRouterState } from "@tanstack/react-router";
import {
  FolderKanban,
  Layers,
  Minus,
  Wrench,
  Drill,
  Grid3x3,
  Box,
  Home,
  Settings as SettingsIcon,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const items = [
  { to: "/projetos", label: "Projetos", icon: FolderKanban },
  { to: "/ambientes", label: "Ambientes", icon: Home },
  { to: "/modulos", label: "Módulos", icon: Box },
  { to: "/materiais", label: "Materiais", icon: Layers },
  { to: "/orlas", label: "Orlas", icon: Minus },
  { to: "/ferragens", label: "Ferragens", icon: Wrench },
  { to: "/brocas", label: "Brocas", icon: Drill },
  { to: "/templates-furacao", label: "Templates de Furação", icon: Grid3x3 },
  { to: "/definicoes", label: "Definições", icon: SettingsIcon },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Layers className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            MARCENARIA
          </span>
          <span className="text-sm font-semibold">{APP_NAME}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 px-2 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t px-4 py-3 text-[11px] text-muted-foreground">
        v0.1 · Fundação
      </div>
    </nav>
  );
}
