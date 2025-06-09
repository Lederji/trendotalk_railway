import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, MoreVertical, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function DMChatPage() {
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('DMChatPage - Component rendered, chatId:', chatId, 'user:', user);

  // Fetch chat data
  const { data: chat, isLoading } = useQuery({
    queryKey: [`/api/dm/${chatId}`],
    enabled: !!chatId,
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: [`/api/dm/${chatId}/messages`],
    enabled: !!chatId,
    refetchInterval: 2000,
  }) as { data: any[] };

  // Check if this chat has any pending requests or message restrictions
  const { data: chatStatus } = useQuery({
    queryKey: [`/api/dm/chats/${chatId}/status`],
    enabled: !!chatId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', `/api/dm/${chatId}/messages`, { message: content });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/dm/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dm/chats/${chatId}/status`] });
    },
    onError: (error: any) => {
      if (error.message?.includes('one message until')) {
        // This is the restriction error - don't show toast, the UI will handle it
        queryClient.invalidateQueries({ queryKey: [`/api/dm/chats/${chatId}/status`] });
      } else if (error.message?.includes('72 hours') || error.message?.includes('dismissed')) {
        // Handle 72-hour cooldown error
        toast({
          title: "Message Blocked",
          description: "You cannot send messages for 72 hours after being dismissed",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send message",
          variant: "destructive",
        });
      }
    }
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!(chatStatus as any)?.isRestricted) {
      if (selectedFile) {
        // Upload file first, then send message with file info
        await handleFileUploadAndSend();
      } else if (message.trim()) {
        // Send text message
        sendMessageMutation.mutate(message.trim());
        setMessage("");
      }
    }
  };

  const handleFileUploadAndSend = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const fileUrl = result.url;
        
        // Create message content with file info
        let fileMessage = '';
        if (selectedFile.type.startsWith('image/')) {
          fileMessage = `📷 ${selectedFile.name}\n${fileUrl}`;
        } else if (selectedFile.type.startsWith('video/')) {
          fileMessage = `🎥 ${selectedFile.name}\n${fileUrl}`;
        } else {
          fileMessage = `📄 ${selectedFile.name}\n${fileUrl}`;
        }

        // Add text message if provided
        const finalMessage = message.trim() ? `${message.trim()}\n${fileMessage}` : fileMessage;
        
        // Send the message with file
        sendMessageMutation.mutate(finalMessage);
        
        // Clear file selection and message
        setSelectedFile(null);
        setMessage("");
      } else {
        toast({
          title: "Upload failed",
          description: "Failed to upload file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload error",
        description: "An error occurred while uploading the file",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle DM request actions
  const handleDMRequestAction = async (action: 'allow' | 'dismiss' | 'block') => {
    try {
      // Find the pending request for this chat
      const requestsResponse = await fetch('/api/dm/requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      
      if (!requestsResponse.ok) throw new Error('Failed to fetch requests');
      const requests = await requestsResponse.json();
      
      const otherUserId = (chat as any)?.user?.id;
      const pendingRequest = requests.find((req: any) => req.fromUser.id === otherUserId);
      
      if (!pendingRequest) {
        toast({
          title: "Error",
          description: "No pending request found for this user",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/dm/requests/${pendingRequest.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/dm/chats/${chatId}/status`] });
        queryClient.invalidateQueries({ queryKey: [`/api/dm/${chatId}/messages`] });
        queryClient.invalidateQueries({ queryKey: [`/api/dm/requests`] });
        queryClient.invalidateQueries({ queryKey: [`/api/dm/chats`] });
        queryClient.invalidateQueries({ queryKey: [`/api/dm-new-chats`] });
        
        if (action === 'allow') {
          toast({
            title: "Request Accepted",
            description: "You can now chat freely with this user",
          });
        } else if (action === 'dismiss') {
          toast({
            title: "Request Dismissed",
            description: "Request dismissed for 72 hours",
          });
          setLocation('/messages');
        } else if (action === 'block') {
          toast({
            title: "User Blocked",
            description: "This user has been permanently blocked",
          });
          setLocation('/messages');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const otherUser = messages.length > 0 ? 
    messages.find(msg => msg.senderId !== user?.id)?.sender || 
    messages.find(msg => msg.senderId === user?.id)?.recipient 
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/messages")}
              className="p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherUser?.avatar} alt={otherUser?.displayName || otherUser?.username} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {(otherUser?.displayName || otherUser?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="font-semibold text-gray-900">
                  {otherUser?.displayName || otherUser?.username || 'User'}
                </h2>
                <p className="text-sm text-gray-500">Active now</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <Send className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Start the conversation</h3>
            <p className="text-gray-500">Send a message to begin your chat</p>
          </div>
        ) : (
          messages.map((msg: any, index: number) => (
            <div key={msg.id}>
              <div
                className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    msg.sender_id === user?.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_id === user?.id ? 'text-purple-100' : 'text-gray-500'
                  }`}>
                    {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Now'}
                  </p>
                </div>
              </div>
              
              {/* Show action buttons for new messages from other users if there's a pending request */}
              {msg.sender_id !== user?.id && index === 0 && (chatStatus as any)?.hasPendingRequest && (
                <div className="mt-3 flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-w-xs">
                    <p className="text-xs text-gray-600 mb-2">New message request</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleDMRequestAction('allow')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 px-3 py-1 text-xs"
                      >
                        Allow
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleDMRequestAction('dismiss')}
                        variant="outline"
                        className="text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
                      >
                        Dismiss
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleDMRequestAction('block')}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 px-3 py-1 text-xs"
                      >
                        Block
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
      />

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {(chatStatus as any)?.isRestricted && !(chatStatus as any)?.isBlocked ? (
          <div className="text-center py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3">
              <p className="text-orange-800 text-sm font-medium">
                {(chatStatus as any)?.wasDismissed ? "Request Dismissed" : "Message Request Sent"}
              </p>
              <p className="text-orange-600 text-xs mt-1">
                {(chatStatus as any)?.wasDismissed 
                  ? "You can send another message after 72 hours"
                  : "You can send more messages once they accept your request"
                }
              </p>
            </div>
          </div>
        ) : (chatStatus as any)?.isBlocked ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-red-700">
              <div className="w-5 h-5 rounded-full bg-red-500"></div>
              <div className="text-center">
                <p className="font-medium">Message Blocked</p>
                <p className="text-sm text-red-600">
                  {(chatStatus as any)?.blockType === 'temporary' 
                    ? `You cannot send messages for 72 hours after being dismissed. Try again later.`
                    : 'You cannot send messages to this user.'
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* File preview */}
            {selectedFile && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <Paperclip className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-600">{selectedFile.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500"
                >
                  ×
                </Button>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="flex items-center bg-gray-100 rounded-2xl">
                  {/* File upload button inside input */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-8 h-8 ml-2 text-gray-500"
                    onClick={handleFileUpload}
                    disabled={(chatStatus as any)?.isRestricted}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="border-0 bg-transparent focus:ring-0 focus:border-0 rounded-2xl px-3"
                    disabled={(chatStatus as any)?.isRestricted}
                  />
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isPending || (chatStatus as any)?.isRestricted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 rounded-full p-3"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}