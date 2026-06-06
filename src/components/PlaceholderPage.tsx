import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Construction className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-medium">Em construção</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Esta secção faz parte da próxima fase. A fundação técnica já está pronta
          para a receber.
        </p>
      </div>
    </div>
  );
}
