import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MessageCircle, Heart, Menu, User, Settings, HelpCircle, Info, LogOut, ShieldCheck, Phone, Mail, CheckCircle, DollarSign, AtSign, Megaphone } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export function Header() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [showAccountCenter, setShowAccountCenter] = useState(false);
  const [showServiceRequest, setShowServiceRequest] = useState(false);

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
              
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-gray-100 rounded-full relative"
              >
                <Heart className="h-5 w-5 text-gray-600" />
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-gradient-to-r from-pink-500 to-purple-600">
                  7
                </Badge>
              </Button>
              
              {/* Profile Avatar */}
              <Link href={`/profile/${user?.id}`}>
                <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-pink-500 transition-all">
                  <AvatarImage src={user?.avatar} alt={user?.username} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
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
                  <DropdownMenuItem onClick={() => setShowAccountCenter(true)}>
                    <User className="mr-2 h-4 w-4" />
                    Account Center
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => {
                    toast({ title: "Time Management", description: "Feature coming soon" });
                  }}>
                    <Settings className="mr-2 h-4 w-4" />
                    Time Management
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShowServiceRequest(true)}>
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

                  <DropdownMenuItem onClick={async () => {
                    try {
                      await logout();
                      window.location.href = "/login";
                      toast({ title: "Logged out successfully" });
                    } catch (error) {
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
