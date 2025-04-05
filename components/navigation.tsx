"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface NavigationProps {
  onLogout: () => void;
}

export default function Navigation({ onLogout }: NavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex-1" />
        <h1 className="text-xl font-bold">Travel and Taste</h1>
        <div className="flex flex-1 items-center justify-end gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-9 w-9"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}