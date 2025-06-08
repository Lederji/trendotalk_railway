import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Send } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface DMButtonProps {
  userId: number;
  size?: "sm" | "lg" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  children?: React.ReactNode;
}

export function DMButton({ userId, size = "sm", variant = "outline", children }: DMButtonProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/dm/create', { userId });
      return response.json();
    },
    onSuccess: (response: any) => {
      if (response.chatId) {
        // Always redirect to DM chat directly (Instagram-style)
        setLocation(`/dm/${response.chatId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    }
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => createChatMutation.mutate()}
      disabled={createChatMutation.isPending}
      className="flex items-center gap-2 flex-1"
    >
      <MessageCircle className="w-4 h-4" />
      {children || "Message"}
    </Button>
  );
}