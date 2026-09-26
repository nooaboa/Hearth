"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function WatchMeetings({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 90_000) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}
