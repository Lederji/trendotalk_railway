import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Heart } from "lucide-react";

export function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <h1 className="text-2xl font-bold gradient-text cursor-pointer">
            TrendoTalk
          </h1>
        </Link>
        
        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="Search users, trends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-purple-300 rounded-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          </div>
        </div>
        
        {/* Mobile Search (Expandable) */}
        {showMobileSearch && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search users, trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-purple-300 rounded-full"
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </div>
        )}
        
        {/* Right Icons */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-gray-100 rounded-full md:hidden"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
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
        </div>
      </div>
    </header>
  );
}
