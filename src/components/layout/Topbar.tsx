import { Menu, LogOut, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

interface TopbarProps {
  email?: string | null;
  projectName?: string | null;
  onCloseProject?: () => void;
  onOpenSidebar?: () => void;
}

export function Topbar({ email, projectName, onCloseProject, onOpenSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              PROJETO
            </span>
            <span className="text-sm font-medium">
              {projectName ?? "Sem projeto aberto"}
            </span>
          </div>
          {projectName && onCloseProject ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onCloseProject}
              aria-label="Fechar projeto"
              title="Fechar projeto"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <UserIcon className="h-3.5 w-3.5" />
            </div>
            <span className="hidden text-sm sm:inline">{email ?? "Conta"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Sessão</span>
              <span className="truncate text-sm">{email ?? "—"}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Terminar sessão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
