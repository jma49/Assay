"use client";

import { LogOut } from "lucide-react";
import { useLanguage } from "@/components/common/LanguageProvider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut, type CurrentUser } from "@/lib/auth/client";
import { cn } from "@/lib/utils/utils";

const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";

/** The signed-in person's avatar, with who they are and a way out. `room` is the dark rail variant. */
export function UserMenu({ user, tone }: { user: CurrentUser; tone?: "room" }) {
  const { language } = useLanguage();
  const room = tone === "room";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(
          "flex min-w-0 items-center gap-2 rounded-sm py-0.5 pr-1.5 text-left outline-none",
          room ? "hover:bg-room-800 focus-visible:outline-room-ink" : "hover:bg-muted",
        )}>
        {user.image ? (
          // Provider avatars come from many hosts; next/image would need each one configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-6 shrink-0 rounded-full" />
        ) : (
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-caption font-semibold", room ? "bg-room-800 text-room-ink" : "bg-primary-soft text-primary-ink")}>{initials(user.name)}</span>
        )}
        <span className={cn("truncate text-body-sm max-md:hidden", room ? "text-room-ink-2" : "text-muted-foreground")}>{user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="truncate text-body-sm font-medium">{user.name}</span>
          <span className="truncate text-caption text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* A full load on purpose: nothing of the signed-in session may stay in client state. */}
        {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
        <DropdownMenuItem onSelect={() => void signOut().then(() => window.location.assign("/"))}>
          <LogOut />
          {language === "zh" ? "退出登录" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
