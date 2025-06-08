import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Camera, Mic, Paperclip, Image, Phone, Video, MoreVertical, FileText, MapPin, User, Calendar, Headphones, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, { file: File, progress: number, preview: string }>>(new Map());
  const [fullScreenMedia, setFullScreenMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat data
  const { data: chat, isLoading } = useQuery({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
  }) as { data: any, isLoading: boolean };

  // Fetch messages with optimized polling
  const { data: messages = [] } = useQuery({
    queryKey: [`/api/chats/${chatId}/messages`],
    enabled: !!chatId,
    refetchInterval: 1000, // 1 second polling for good real-time experience
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  }) as { data: any[] };

  // WhatsApp-style file upload with instant preview
  const uploadFileInstantly = async (file: File) => {
    const fileId = Date.now().toString();
    const preview = URL.createObjectURL(file);
    
    // Add to uploading files with preview
    setUploadingFiles(prev => new Map(prev.set(fileId, { file, progress: 0, preview })));
    
    try {
      const sessionId = localStorage.getItem('sessionId');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message', message || '');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => {
          const current = prev.get(fileId);
          if (current && current.progress < 90) {
            return new Map(prev.set(fileId, { ...current, progress: current.progress + 10 }));
          }
          return prev;
        });
      }, 100);
      
      const response = await fetch(`/api/chats/${chatId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        },
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (response.ok) {
        // Complete upload
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
        setMessage("");
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
      toast({
        title: "Upload failed",
        description: "Failed to send media",
        variant: "destructive",
      });
    }
  };

  // Send message mutation with better error handling
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const sessionId = localStorage.getItem('sessionId');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionId}`
      };
      
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: content }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessage("");
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Message failed",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Kick out mutation to remove user from friend list
  const kickOutMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`/api/friends/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ friendId: chat?.user?.id }),
      });
      if (!response.ok) throw new Error('Failed to remove friend');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User removed",
        description: "User has been removed from your friend list",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (message.trim() || selectedFile) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    setIsTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
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
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
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
      uploadFileInstantly(file);
      setShowAttachmentMenu(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileInstantly(file);
      setShowAttachmentMenu(false);
    }
  };

  // Location sharing
  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=demo&limit=1`);
            const data = await response.json();
            const address = data.results[0]?.formatted || `${latitude}, ${longitude}`;
            
            const locationResponse = await fetch(`/api/chats/${chatId}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
              },
              body: JSON.stringify({ latitude, longitude, address })
            });
            
            if (locationResponse.ok) {
              queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
              toast({
                title: "Location shared",
                description: "Your location has been shared successfully",
              });
            }
          } catch (error) {
            toast({
              title: "Location share failed",
              description: "Failed to share location",
              variant: "destructive",
            });
          }
        },
        () => {
          toast({
            title: "Location access denied",
            description: "Please allow location access to share your location",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location sharing",
        variant: "destructive",
      });
    }
    setShowAttachmentMenu(false);
  };

  // Contact sharing
  const handleContactShare = () => {
    const name = prompt("Enter contact name:");
    const phone = prompt("Enter contact phone:");
    const email = prompt("Enter contact email (optional):");
    
    if (name && phone) {
      fetch(`/api/chats/${chatId}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: JSON.stringify({ name, phone, email })
      }).then(response => {
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
          toast({
            title: "Contact shared",
            description: "Contact has been shared successfully",
          });
        }
      }).catch(() => {
        toast({
          title: "Contact share failed",
          description: "Failed to share contact",
          variant: "destructive",
        });
      });
    }
    setShowAttachmentMenu(false);
  };

  // Audio recording
  const handleAudioRecord = () => {
    if (!isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
          };
          
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
            uploadVoiceMessage(audioBlob);
            stream.getTracks().forEach(track => track.stop());
          };
          
          mediaRecorder.start();
          setIsRecording(true);
          toast({
            title: "Recording started",
            description: "Tap again to stop and send",
          });
        })
        .catch(() => {
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access to record audio",
            variant: "destructive",
          });
        });
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    setShowAttachmentMenu(false);
  };

  const handleVideoCall = () => {
    toast({
      title: "Video Call",
      description: "Starting video call...",
    });
  };

  const handleVoiceCall = () => {
    toast({
      title: "Voice Call", 
      description: "Starting voice call...",
    });
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/circle")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-10 h-10">
          <AvatarImage src={chat?.user?.avatar} alt={chat?.user?.username} />
          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            {chat?.user?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="font-semibold text-lg">{chat?.user?.username || 'User'}</h1>
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
            onClick={handleVideoCall}
          >
            <Video className="w-5 h-5" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-gray-600 hover:bg-gray-100"
              onClick={() => setShowChatMenu(!showChatMenu)}
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
            {showChatMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-20 min-w-[150px]">
                <button
                  onClick={() => {
                    kickOutMutation.mutate();
                    setShowChatMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                  disabled={kickOutMutation.isPending}
                >
                  {kickOutMutation.isPending ? "Removing..." : "Kick Out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.isArray(messages) && messages.length === 0 && uploadingFiles.size === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {/* Uploading Files Preview */}
            {Array.from(uploadingFiles.entries()).map(([fileId, fileData]) => (
              <div key={fileId} className="flex justify-end">
                <div className="max-w-xs lg:max-w-md bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-2 relative">
                  {fileData.file.type.startsWith('image/') ? (
                    <div className="relative">
                      <img 
                        src={fileData.preview} 
                        alt="Uploading..." 
                        className="max-w-full h-auto rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span className="text-sm">{fileData.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ) : fileData.file.type.startsWith('video/') ? (
                    <div className="relative">
                      <video 
                        src={fileData.preview} 
                        className="max-w-full h-auto rounded-lg"
                        muted
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span className="text-sm">{fileData.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <div>
                        <p className="text-sm">📄 {fileData.file.name}</p>
                        <p className="text-xs opacity-70">{fileData.progress}% uploading...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Regular Messages */}
            {Array.isArray(messages) && messages.map((msg: any) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  msg.senderId === user?.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {(() => {
                  const content = msg.message || msg.content || '';
                  const lines = content.split('\n');
                  
                  // Check if it's a media message
                  if (lines.length > 1 && lines[1].startsWith('http')) {
                    const mediaUrl = lines[1];
                    const description = lines[0];
                    
                    return (
                      <div>
                        <p className="text-sm mb-2">{description}</p>
                        {description.includes('📷') && (
                          <img 
                            src={mediaUrl} 
                            alt="Shared image" 
                            className="max-w-full h-auto rounded-lg mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onClick={() => setFullScreenMedia({ url: mediaUrl, type: 'image' })}
                          />
                        )}
                        {description.includes('🎥') && (
                          <div 
                            className="relative cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setFullScreenMedia({ url: mediaUrl, type: 'video' })}
                          >
                            <video 
                              src={mediaUrl} 
                              className="max-w-full h-auto rounded-lg mb-2"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black bg-opacity-50 rounded-full p-3">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )}
                        {description.includes('🎵') && (
                          <audio 
                            src={mediaUrl} 
                            controls 
                            className="w-full mb-2"
                          />
                        )}
                        {description.includes('📄') && (
                          <a 
                            href={mediaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`inline-block p-2 rounded border ${
                              msg.senderId === user?.id 
                                ? 'border-white/30 text-white hover:bg-white/10' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            📄 View Document
                          </a>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular text message
                  return <p className="text-sm whitespace-pre-wrap">{content}</p>;
                })()}
                
                {/* Message status and timestamp */}
                <div className={`flex items-center justify-between mt-1 text-xs ${
                  msg.senderId === user?.id ? 'text-white/70' : 'text-gray-500'
                }`}>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {msg.senderId === user?.id && (
                    <div className="flex items-center ml-2">
                      {/* Message status indicators */}
                      {sendMessageMutation.isPending && msg.id === 'temp' ? (
                        <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="flex">
                          {/* Single check - sent */}
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {/* Double check - delivered */}
                          <svg className="w-3 h-3 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          </>
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

        <div className="flex items-center space-x-3">
          
          {/* Message Input */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-gray-100 rounded-2xl">
              {/* Attachment Button Inside Input */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 ml-2 text-gray-500"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
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
              
              {/* Camera inside input */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 mr-2 text-gray-500"
                onClick={() => imageInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Attachment Menu Inside Input Area */}
            {showAttachmentMenu && (
              <div className="absolute bottom-14 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
                <div className="grid grid-cols-3 gap-3">
                  {/* Gallery */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-blue-50"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                  >
                    <ImageIcon className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-xs">Gallery</span>
                  </Button>

                  {/* Document */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-purple-50"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                  >
                    <FileText className="w-5 h-5 text-purple-500 mb-1" />
                    <span className="text-xs">Document</span>
                  </Button>

                  {/* Location */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-green-50"
                    onClick={handleLocationShare}
                  >
                    <MapPin className="w-5 h-5 text-green-500 mb-1" />
                    <span className="text-xs">Location</span>
                  </Button>

                  {/* Contact */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-cyan-50"
                    onClick={handleContactShare}
                  >
                    <User className="w-5 h-5 text-cyan-500 mb-1" />
                    <span className="text-xs">Contact</span>
                  </Button>

                  {/* Audio */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center p-2 hover:bg-orange-50 ${isRecording ? 'bg-red-100' : ''}`}
                    onClick={handleAudioRecord}
                  >
                    <Headphones className={`w-5 h-5 mb-1 ${isRecording ? 'text-red-500' : 'text-orange-500'}`} />
                    <span className="text-xs">{isRecording ? 'Stop' : 'Audio'}</span>
                  </Button>
                  
                  {/* Camera */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex flex-col items-center p-2 hover:bg-pink-50"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowAttachmentMenu(false);
                    }}
                  >
                    <Camera className="w-5 h-5 text-pink-500 mb-1" />
                    <span className="text-xs">Camera</span>
                  </Button>
                </div>
              </div>
            )}
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
          accept="image/*,video/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        
        {/* Full Screen Media Viewer */}
        {fullScreenMedia && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
            onClick={() => setFullScreenMedia(null)}
          >
            <div className="relative max-w-4xl max-h-full p-4">
              <button
                onClick={() => setFullScreenMedia(null)}
                className="absolute top-4 right-4 text-white text-2xl z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70"
              >
                ×
              </button>
              {fullScreenMedia.type === 'image' ? (
                <img 
                  src={fullScreenMedia.url} 
                  alt="Full screen view" 
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <video 
                  src={fullScreenMedia.url} 
                  autoPlay
                  loop
                  playsInline
                  className="max-w-full max-h-full"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    outline: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}