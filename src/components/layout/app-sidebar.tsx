"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Coins
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/incomes", icon: Wallet, label: "Incomes" },
  { href: "/dashboard/expenses", icon: Wallet, label: "Expenses", isFlipped: true },
  {
    icon: FileText,
    label: "Reports",
    subItems: [
      { href: "/dashboard/reports/services", label: "Service Report" },
      { href: "/dashboard/reports/general", label: "Total General" },
      { href: "/dashboard/reports/clients", label: "Clients & Debts" },
    ],
  },
  { href: "/dashboard/accounts", icon: Landmark, label: "Accounts" },
  { href: "/dashboard/payroll", icon: Users, label: "Payroll" },
  { href: "/dashboard/reminders", icon: FileText, label: "Reminders" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userName } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                 <Coins className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-semibold text-primary">MonsterFinance</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) =>
            item.subItems ? (
              <Collapsible.Root key={item.label} className="group/menu-item">
                <Collapsible.Trigger className="w-full">
                  <SidebarMenuButton
                    className="justify-between"
                    isActive={item.subItems.some(sub => pathname.startsWith(sub.href))}
                  >
                    <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </SidebarMenuButton>
                </Collapsible.Trigger>
                <Collapsible.Content>
                    <SidebarMenuSub>
                    {item.subItems.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.href}>
                        <SidebarMenuSubButton
                            href={subItem.href}
                            isActive={pathname === subItem.href}
                            onClick={(e) => {
                                e.preventDefault();
                                router.push(subItem.href);
                            }}
                        >
                            {subItem.label}
                        </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                    ))}
                    </SidebarMenuSub>
                </Collapsible.Content>
              </Collapsible.Root>
            ) : (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  href={item.href}
                  isActive={pathname === item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(item.href!);
                  }}
                >
                  <item.icon className={item.isFlipped ? "transform -scale-x-100" : ""}/>
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {userName ? getInitials(userName) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <span className="font-semibold truncate">{userName || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email || "No email"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
