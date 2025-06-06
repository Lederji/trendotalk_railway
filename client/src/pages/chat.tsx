import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Camera, Mic, Paperclip, Image, Phone, Video, MoreVertical, FileText, MapPin, User, Calendar, Headphones, BarChart3, CreditCard, ImageIcon, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    refetchInterval: 500, // Fast polling for near real-time experience
  });

  // Typing indicator state management
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: JSON.stringify({ message: content }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
      setMessage("");
      setSelectedFile(null);
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

  const handleTyping = () => {
    // Simple local typing indicator
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        await uploadVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Access",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVoiceMessage = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.mp3');
    
    try {
      const response = await fetch(`/api/chats/${chatId}/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: formData
      });
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
        toast({
          title: "Voice message sent",
          description: "Your voice message has been sent successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to send voice message",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // TODO: Handle file upload
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleVideoCall = () => {
    toast({
      title: "Video Call",
      description: "Starting video call...",
    });
    // Video call implementation would go here
  };

  const handleVoiceCall = () => {
    toast({
      title: "Voice Call", 
      description: "Starting voice call...",
    });
    // Voice call implementation would go here
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
          <p className="text-sm text-gray-500">
            {otherUserTyping ? 'Typing...' : 'Active now'}
          </p>
        </div>
        
        {/* Voice and Video Call Icons */}
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
            onClick={handleVoiceCall}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
            onClick={() => {
              toast({
                title: "Video Call",
                description: "Video calling feature will be available soon",
              });
            }}
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-600 hover:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
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

      {/* WhatsApp-Style Message Input */}
      <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0 relative">
        {/* File Preview */}
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

        {/* WhatsApp Attachment Menu */}
        {showAttachmentMenu && (
          <div className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-2xl p-6 z-50">
            <div className="grid grid-cols-4 gap-6">
              {/* Gallery */}
              <div className="flex flex-col items-center space-y-2">
                <Button
                  className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <ImageIcon className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Gallery</span>
              </div>

              {/* Camera */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600">
                  <Camera className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Camera</span>
              </div>

              {/* Location */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600">
                  <MapPin className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Location</span>
              </div>

              {/* Contact */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-blue-400 hover:bg-blue-500">
                  <User className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Contact</span>
              </div>

              {/* Document */}
              <div className="flex flex-col items-center space-y-2">
                <Button
                  className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentMenu(false);
                  }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Document</span>
              </div>

              {/* Audio */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600">
                  <Headphones className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Audio</span>
              </div>

              {/* Event */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600">
                  <Calendar className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">Event</span>
              </div>

              {/* AI Images */}
              <div className="flex flex-col items-center space-y-2">
                <Button className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700">
                  <ImageIcon className="w-6 h-6 text-white" />
                </Button>
                <span className="text-xs text-white">AI Images</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10 text-gray-500"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-gray-100 rounded-2xl">
              <Input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="Message"
                className="flex-1 border-0 bg-transparent rounded-2xl px-4 py-3 min-h-[48px] focus:ring-0 focus:outline-none"
                disabled={sendMessageMutation.isPending}
              />
              
              {/* File icon inside input */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 mr-1 text-gray-500"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              {/* Camera inside input */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 mr-2 text-gray-500"
                onClick={() => imageInputRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Send/Mic Button */}
          {message.trim() || selectedFile ? (
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 w-12 h-12"
              size="icon"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full w-12 h-12 ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
              }`}
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onTouchStart={startVoiceRecording}
              onTouchEnd={stopVoiceRecording}
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
        
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>
    </div>
  );
}