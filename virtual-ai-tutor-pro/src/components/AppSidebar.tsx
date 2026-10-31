import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, ListChecks, Map, TrendingUp, Code2, GraduationCap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Tutor", url: "/tutor", icon: MessageCircle },
  { title: "Quizzes", url: "/quiz", icon: ListChecks },
  { title: "Roadmap", url: "/roadmap", icon: Map },
  { title: "Progress", url: "/progress", icon: TrendingUp },
  { title: "Code Explainer", url: "/code", icon: Code2 },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground shadow-brand">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-bold">AI Tutor Pro</p>
            <p className="text-xs text-muted-foreground">Learn smarter</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Learn</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                    <Link to={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
