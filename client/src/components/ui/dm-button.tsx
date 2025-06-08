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
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const createRequestMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest('POST', '/api/dm/create', { userId, message: messageContent });
      return response.json();
    },
    onSuccess: (response: any) => {
      if (response.chatId) {
        // Chat already exists - redirect directly
        setLocation(`/dm/${response.chatId}`);
      } else if (response.requestId) {
        // Request created successfully
        toast({
          title: "Message Sent",
          description: "Your message request has been sent",
        });
        setIsOpen(false);
        setMessage("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    createRequestMutation.mutate(message.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2 flex-1"
        >
          <MessageCircle className="w-4 h-4" />
          {children || "Message"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={createRequestMutation.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim() || createRequestMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}