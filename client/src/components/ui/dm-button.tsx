import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
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
      return apiRequest('POST', '/api/chats/create', { userId });
    },
    onSuccess: (response: any) => {
      if (response.chatId) {
        // Always redirect to chat directly (Instagram-style)
        setLocation(`/chat/${response.chatId}`);
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
      className="flex items-center gap-2"
    >
      <MessageCircle className="w-4 h-4" />
      {children || "Message"}
    </Button>
  );
}