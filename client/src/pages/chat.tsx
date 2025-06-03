import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Camera, Mic, Paperclip } from "lucide-react";

export default function ChatPage() {
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: chat, isLoading } = useQuery({
    queryKey: ["/api/chats", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chat');
      return response.json();
    },
    enabled: !!chatId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/chats", chatId, "messages"],
    queryFn: async () => {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!chatId,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: content }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      setMessage("");
    },
  });

  const handleSendMessage = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Chat not found</p>
          <Button onClick={() => setLocation("/circle")}>
            Back to Circle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center space-x-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/circle")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-10 h-10">
          <AvatarImage src={chat.user.avatar} alt={chat.user.username} />
          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            {chat.user.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="font-semibold text-lg">{chat.user.username}</h1>
          <p className="text-sm text-gray-500">Active now</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  msg.senderId === user?.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.senderId === user?.id ? 'text-pink-100' : 'text-gray-500'
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Camera className="w-5 h-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="rounded-full pr-12"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 rounded-full"
            >
              <Mic className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}