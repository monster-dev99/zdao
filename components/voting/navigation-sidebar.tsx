"use client"

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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Shield, Vote, Plus, BarChart3, History } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavigationSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  {
    id: "vote",
    label: "Active Proposals", // Changed from "Vote" to be more descriptive
    icon: Vote,
  },
  {
    id: "create",
    label: "New Proposal", // Changed from "Create" to be more explicit
    icon: Plus,
  },
  {
    id: "analytics",
    label: "Overview", // Changed from "Analytics" to be simpler and clearer
    icon: BarChart3,
  },
  {
    id: "history",
    label: "Voting History", // Changed from "My Votes" to be more descriptive
    icon: History,
  },
]

export function NavigationSidebar({
  activeTab,
  onTabChange,
}: NavigationSidebarProps) {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="border-r border-neon-cyan/30 cyber-border bg-cyber-gray/90 backdrop-blur-xl"
    >
      <SidebarHeader className="border-b border-neon-cyan/30 cyber-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyber-dark-gray border border-neon-cyan cyber-border">
            <Shield className="h-5 w-5 text-neon-cyan neon-glow-cyan" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-bold text-neon-cyan neon-glow-cyan">ZDAO</h2>
            <p className="text-xs text-cyber-medium-gray">Privacy Voting</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-cyber-medium-gray text-xs uppercase tracking-wider group-data-[collapsible=icon]:hidden mb-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      isActive={isActive}
                      className={cn(
                        "w-full justify-start text-cyber-medium-gray hover:text-neon-cyan hover:bg-cyber-dark-gray/50 transition-all duration-200 border border-transparent",
                        isActive &&
                          "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.3)] font-medium",
                      )}
                      tooltip={item.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export { SidebarTrigger }
