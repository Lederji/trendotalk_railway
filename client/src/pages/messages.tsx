import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Video, Info } from "lucide-react";
import { useLocation } from "wouter";

export function Messages() {
  const [, setLocation] = useLocation();



  // Mock data for messages and requests
  const messages = [
    {
      id: 1,
      username: "admin",
      displayName: "TrendoTalk Admin",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      lastMessage: "Welcome to TrendoTalk! 🎉",
      timestamp: "2 min ago",
      unreadCount: 1,
      isOnline: true
    },
    {
      id: 2,
      username: "jane_doe",
      displayName: "Jane Doe",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      lastMessage: "Hey! How are you doing?",
      timestamp: "1 hour ago",
      unreadCount: 0,
      isOnline: false
    }
  ];

  const requests = [
    {
      id: 1,
      username: "new_user",
      displayName: "New User",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      mutualFriends: 3,
      timestamp: "5 min ago"
    }
  ];

  const handleUserClick = (username: string) => {
    setLocation(`/chat/${username}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Direct Messages
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">


        {/* Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-1">
            <TabsTrigger 
              value="messages" 
              className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Messages
              {messages.some(msg => msg.unreadCount > 0) && (
                <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 text-xs">
                  {messages.reduce((acc, msg) => acc + msg.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Requests
              {requests.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 text-xs">
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <ArrowLeft className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={message.avatar} alt={message.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {message.displayName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {message.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {message.displayName}
                        </h3>
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {message.lastMessage}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {message.unreadCount > 0 && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white h-6 w-6 p-0 text-xs rounded-full">
                          {message.unreadCount}
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                          <Video className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <Info className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No message requests</p>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={request.avatar} alt={request.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {request.displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {request.displayName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        @{request.username} • {request.mutualFriends} mutual friends
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{request.timestamp}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 px-4"
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-gray-600 hover:bg-gray-50 px-4"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}