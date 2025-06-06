import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";

interface User {
  id: number;
  username: string;
  avatar?: string;
}

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  content: string;
  createdAt: string;
}

interface Chat {
  id: number;
  user: User;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function ChatNew() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageText, setMessageText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const response = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: async () => {
      const response = await fetch("/api/chats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch chats");
      return response.json();
    },
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: number; message: string }) => {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: (newMessage) => {
      if (selectedChat) {
        const updatedChat = {
          ...selectedChat,
          messages: [...(selectedChat.messages || []), newMessage]
        };
        setSelectedChat(updatedChat);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessageText("");
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    sendMessageMutation.mutate({ chatId: selectedChat.id, message: messageText });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedChat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center gradient-text">Chats</CardTitle>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No chats yet</p>
                <p className="text-sm mt-2">Accept friend requests to start chatting</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat: Chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.user.avatar} alt={chat.user.username} />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                        {chat.user.username[3]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{chat.user.username}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {chat.lastMessage || "Start a conversation"}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {chat.lastMessageTime && new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full p-2"
            onClick={() => setSelectedChat(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
            <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              {selectedChat.user.username[3]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold">{selectedChat.user.username}</h2>
            <p className="text-sm text-gray-500">Online</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="rounded-full">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4" 
          style={{ 
            backgroundImage: 'linear-gradient(to bottom, #1e3a8a, #059669)', 
            minHeight: 'calc(100vh - 140px)' 
          }}
        >
          {!selectedChat.messages || selectedChat.messages.length === 0 ? (
            <div className="text-center text-white/70 mt-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            selectedChat.messages.map((message: Message) => (
              <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                {message.senderId !== user?.id && (
                  <Avatar className="w-8 h-8 mr-2 mt-1">
                    <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs">
                      {selectedChat.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-xs px-4 py-2 rounded-2xl shadow-sm ${
                  message.senderId === user?.id 
                    ? 'bg-blue-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.senderId === user?.id ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t p-3">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex items-center">
              <Input 
                placeholder="Type a message..." 
                value={messageText} 
                onChange={(e) => setMessageText(e.target.value)} 
                onKeyPress={handleKeyPress}
                className="border-none bg-transparent focus:ring-0 focus:outline-none text-sm flex-1" 
                disabled={sendMessageMutation.isPending}
              />
            </div>
            {messageText.trim() && (
              <Button 
                onClick={handleSendMessage} 
                disabled={sendMessageMutation.isPending}
                className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-3"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}