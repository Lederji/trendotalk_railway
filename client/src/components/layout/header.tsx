import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MessageCircle, Heart, Menu, User, Settings, HelpCircle, Info, LogOut, ShieldCheck, Phone, Mail, CheckCircle, DollarSign, AtSign, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [showAccountCenter, setShowAccountCenter] = useState(false);
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications count
  const { data: notificationCount = { count: 0 } } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notifications list
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user && showNotifications,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/notifications/${notificationId}/read`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/notifications/read-all', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });



  const handleSearchClick = () => {
    setLocation("/search");
  };

  // Hide header on certain pages
  const hideHeader = ["/trends", "/create", "/circle"].includes(location);
  if (hideHeader) {
    return null;
  }

  // Show menu icon only on profile page
  const isProfilePage = location.startsWith("/profile");

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo or Username */}
        {isProfilePage ? (
          <h2 className="text-lg font-semibold text-gray-800">
            {user?.username}
          </h2>
        ) : (
          <Link href="/">
            <h1 className="text-xl md:text-2xl font-bold gradient-text cursor-pointer">
              TrendoTalk
            </h1>
          </Link>
        )}
        
        {/* Right Icons */}
        <div className="flex items-center space-x-3">
          {!isProfilePage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={handleSearchClick}
              >
                <Search className="h-5 w-5 text-gray-600" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 rounded-full relative"
              >
                <MessageCircle className="h-5 w-5 text-gray-600" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600">
                  3
                </Badge>
              </Button>
              
              <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-gray-100 rounded-full relative"
                  >
                    <Heart className="h-5 w-5 text-gray-600" />
                    {(notificationCount as any)?.count > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600">
                        {(notificationCount as any).count}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    {(notifications as any[]).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  
                  {(notifications as any[]).length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Heart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {(notifications as any[]).map((notification: any) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            if (!notification.isRead) {
                              markAsReadMutation.mutate(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3 w-full">
                            <div className="flex-shrink-0">
                              {notification.type === 'like' && (
                                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                                  <Heart className="h-4 w-4 text-white fill-current" />
                                </div>
                              )}
                              {notification.type === 'comment' && (
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                  <MessageCircle className="h-4 w-4 text-white" />
                                </div>
                              )}
                              {notification.type === 'follow' && (
                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                                {(() => {
                                  const message = notification.message;
                                  const parts = message.split(' ');
                                  const username = parts[0];
                                  const restOfMessage = parts.slice(1).join(' ');
                                  
                                  return (
                                    <>
                                      <span 
                                        className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setLocation(`/profile/${username}`);
                                        }}
                                      >
                                        {username}
                                      </span>
                                      <span className="font-normal"> {restOfMessage}</span>
                                    </>
                                  );
                                })()}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {/* Post preview for like/comment or Follow Back button */}
                            <div className="flex-shrink-0 ml-2">
                              {(notification.type === 'like' || notification.type === 'comment') && notification.postId && (
                                <div 
                                  className="w-12 h-12 bg-gray-100 rounded-lg border overflow-hidden cursor-pointer hover:opacity-80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/`);
                                  }}
                                >
                                  {notification.postImage ? (
                                    <img 
                                      src={notification.postImage} 
                                      alt="Post preview" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500">
                                      <div className="w-4 h-4 bg-white rounded"></div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {notification.type === 'follow' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-3 py-1 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-none hover:from-blue-600 hover:to-purple-600"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const username = notification.message.split(' ')[0];
                                    
                                    try {
                                      const response = await apiRequest(`/api/users/${username}/follow-back`, {
                                        method: 'POST'
                                      });
                                      
                                      if (response.ok) {
                                        toast({
                                          title: "Success",
                                          description: `You are now following ${username}`,
                                        });
                                        
                                        // Refresh notifications
                                        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                                        queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to follow back",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                >
                                  Follow Back
                                </Button>
                              )}
                            </div>
                            
                            {!notification.isRead && (
                              <div className="flex-shrink-0 ml-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          {isProfilePage && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Menu className="h-5 w-5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => {
                    console.log('Account Center clicked');
                    setLocation('/account-center');
                  }}>
                    <User className="mr-2 h-4 w-4" />
                    Account Center
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {
                    toast({ title: "Time Management", description: "Feature coming soon" });
                  }}>
                    <Settings className="mr-2 h-4 w-4" />
                    Time Management
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={(e) => {
                    e.preventDefault();
                    console.log('Service Request clicked');
                    setShowServiceRequest(true);
                  }}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Service Request
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {
                    toast({ title: "Help and Support", description: "Contact us at support@trendotalk.com" });
                  }}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help and Support
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {
                    toast({ title: "About TrendoTalk", description: "Version 1.0 - Social Media Platform" });
                  }}>
                    <Info className="mr-2 h-4 w-4" />
                    About
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={async (e) => {
                    e.preventDefault();
                    console.log('Logout clicked');
                    try {
                      // Clear local storage immediately
                      localStorage.removeItem('sessionId');
                      // Redirect immediately to prevent 404 errors
                      window.location.href = "/login";
                      // Call logout API in background
                      logout();
                    } catch (error) {
                      console.error('Logout error:', error);
                      toast({ title: "Logout failed", description: "Please try again" });
                    }
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account Center Dialog */}
              <Dialog open={showAccountCenter} onOpenChange={setShowAccountCenter}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Account Center</DialogTitle>
                    <DialogDescription>
                      Manage your account settings and verification status
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        <span>Account Status</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Active
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <span>Email Verification</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        toast({ title: "Verification email sent!", description: "Check your inbox for the OTP" });
                      }}>
                        Verify
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-5 w-5 text-purple-500" />
                        <span>Mobile Verification</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => {
                        toast({ title: "SMS sent!", description: "Enter the OTP to verify your mobile" });
                      }}>
                        Verify
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Service Request Dialog */}
              <Dialog open={showServiceRequest} onOpenChange={setShowServiceRequest}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Service Request</DialogTitle>
                    <DialogDescription>
                      Submit requests for verification, customization, and advertising services
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-4">
                    <Button variant="outline" className="w-full justify-start" onClick={() => {
                      toast({ title: "Application submitted!", description: "Your verification request is under review" });
                      setShowServiceRequest(false);
                    }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Apply for Verified Tick
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start" onClick={() => {
                      toast({ title: "Request sent!", description: "Username customization request submitted" });
                      setShowServiceRequest(false);
                    }}>
                      <AtSign className="mr-2 h-4 w-4" />
                      Apply to Customize Username
                    </Button>
                    
                    <Button variant="outline" className="w-full justify-start" onClick={() => {
                      toast({ title: "Ad request sent!", description: "Our team will contact you soon" });
                      setShowServiceRequest(false);
                    }}>
                      <Megaphone className="mr-2 h-4 w-4" />
                      Run TrendoTalk Ads
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
