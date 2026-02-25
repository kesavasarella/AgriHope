"use client"

import { useEffect, useState } from "react"
import { db } from "@/lib/database"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AccountTriggerProps {
  userId: number
  name: string
  size?: number // pixels
}

export function AccountTrigger({ userId, name, size = 32 }: AccountTriggerProps) {
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const a = await db.getUserAvatar(userId).catch(() => null)
      setAvatar(a)
    })()
  }, [userId])

  const initials = name
    .split(" ")
    .map((s) => s[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "U"

  return (
    <button
      type="button"
      title="Open account"
      aria-label="Open account"
      className="inline-flex items-center justify-center rounded-full ring-1 ring-border hover:ring-primary transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ width: size, height: size }}
    >
      <Avatar className="rounded-full" style={{ width: size, height: size }}>
        <AvatarImage src={avatar ?? undefined} alt={name} />
        <AvatarFallback className="bg-muted text-foreground text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  )
}
