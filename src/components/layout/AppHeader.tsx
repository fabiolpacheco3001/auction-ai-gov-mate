import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppHeader = () => {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar processos, lotes, bens..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-none outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full" />
        </Button>
        <div className="w-px h-8 bg-border mx-2" />
        <button className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">Maria Silva</p>
            <p className="text-xs text-muted-foreground">Gestora Patrimonial</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
