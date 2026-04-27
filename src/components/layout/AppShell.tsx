import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Columns3,
  CalendarClock,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/followups", label: "Follow-ups", icon: CalendarClock },
];

function NavList({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { user, signOut } = useAuth();
  return (
    <div className="border-t border-border pt-4 mt-auto">
      <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 mb-8">
      <img src="/ARAUTOSIMOB.jpg" alt="Arautos Imobiliária" className="h-8 w-auto rounded-md object-contain" />
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-background p-5">
        <SidebarBrand />
        <NavList />
        <SidebarFooter />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 h-14">
        <div className="flex items-center gap-2">
          <img src="/ARAUTOSIMOB.jpg" alt="Arautos Imobiliária" className="h-7 w-auto rounded-md object-contain" />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-5 flex flex-col">
            <SidebarBrand />
            <NavList onClick={() => setOpen(false)} />
            <SidebarFooter />
          </SheetContent>
        </Sheet>
      </header>

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}