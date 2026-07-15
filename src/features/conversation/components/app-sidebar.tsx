"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useConversations,
  useUpdateConversation,
  useDeleteConversation,
} from "../hooks/use-conversations";
import { startNewChat } from "@/features/home/actions/start-new-chat";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  MessageSquare,
  Plus,
  MoreHorizontal,
  Pin,
  Edit2,
  Trash2,
  Sun,
  Moon,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const { data: conversations, isLoading } = useConversations();
  const { mutate: updateChat } = useUpdateConversation();
  
  const activeChatId = pathname.split("/").pop() || "";
  const { mutate: deleteChat } = useDeleteConversation(activeChatId);

  const handleNewChat = async () => {
    try {
      const chat = await startNewChat();
      router.push(`/chatgpt-clone/c/${chat.id}`);
      toast.success("New chat loaded");
    } catch (err) {
      toast.error("Failed to start new chat");
    }
  };

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = window.prompt("Rename conversation:", currentTitle);
    if (newTitle && newTitle.trim()) {
      updateChat({ id, data: { title: newTitle.trim() } });
    }
  };

  const getInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  return (
    <Sidebar className="border-r border-white/[0.06] bg-[#0d0d0d]">
      <SidebarHeader className="px-4 py-4 space-y-3">
        <Link href="/" className="flex items-center gap-2.5 px-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-sky-400 shadow-md">
            <Sparkles className="h-4.5 w-4.5 text-white" size={16} />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">ChaiGPT</span>
        </Link>
        <Button
          onClick={handleNewChat}
          variant="outline"
          className="w-full justify-start gap-2 border-white/[0.08] hover:bg-white/[0.04] text-xs h-9 text-white"
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu className="space-y-0.5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <SidebarMenuItem key={idx} className="px-2 py-1.5 animate-pulse">
                <div className="h-7 w-full bg-white/[0.04] rounded-lg" />
              </SidebarMenuItem>
            ))
          ) : !conversations || conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No chats yet
            </div>
          ) : (
            conversations.map((chat) => {
              const isActive = activeChatId === chat.id;
              return (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="hover:bg-white/[0.04] active:bg-white/[0.06] text-white"
                  >
                    <Link
                      href={`/chatgpt-clone/c/${chat.id}`}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1 text-xs">
                        {chat.title}
                      </span>
                      {chat.isPinned && (
                        <Pin className="h-3 w-3 fill-primary text-primary shrink-0 rotate-45" />
                      )}
                    </Link>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction className="hover:bg-white/[0.08] text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 border-white/[0.08] bg-[#161616] text-white">
                      <DropdownMenuItem
                        onClick={() => handleRename(chat.id, chat.title)}
                        className="gap-2 text-xs focus:bg-white/[0.06]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          updateChat({
                            id: chat.id,
                            data: { isPinned: !chat.isPinned },
                          })
                        }
                        className="gap-2 text-xs focus:bg-white/[0.06]"
                      >
                        <Pin className="h-3.5 w-3.5" />
                        {chat.isPinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteChat(chat.id)}
                        className="gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="h-4 w-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-muted-foreground hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {user && (
          <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold shrink-0">
              {getInitials()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {user.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
