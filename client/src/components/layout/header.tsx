import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageCircle, Heart, Menu } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

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
        {/* Logo */}
        <Link href="/">
          <h1 className="text-xl md:text-2xl font-bold gradient-text cursor-pointer">
            TrendoTalk
          </h1>
        </Link>
        
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
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
