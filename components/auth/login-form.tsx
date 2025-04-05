"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  onLogin: () => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (password === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      onLogin();
    } else {
      setError("Incorrect password");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to Travel and Taste</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your password to view the adventures
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Enter"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 