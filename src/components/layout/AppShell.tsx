import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";
import { supabase } from "@/integrations/supabase/client";
import { getActiveProject, setActiveProject } from "@/lib/projects.functions";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const qc = useQueryClient();
  const fetchActive = useServerFn(getActiveProject);
  const clearActive = useServerFn(setActiveProject);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: activeProject } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
    enabled: !!email,
  });

  const closeMutation = useMutation({
    mutationFn: () => clearActive({ data: { id: null } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-project"] }),
  });

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-60 shrink-0 border-r lg:block">
        <SidebarNav />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={email}
          projectName={activeProject?.name ?? null}
          onCloseProject={activeProject ? () => closeMutation.mutate() : undefined}
          onOpenSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
