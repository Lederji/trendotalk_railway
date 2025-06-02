import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, Plus, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navigationItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: TrendingUp, label: "Trends", href: "/trends" },
  { icon: Plus, label: "Create", href: "/create" },
  { icon: Users, label: "Circle", href: "/circle" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/profile" && location.startsWith("/profile"));
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-3 ${
                    isActive 
                      ? "text-purple-600" 
                      : "text-gray-600 hover:text-purple-600"
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed left-4 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-white rounded-lg shadow-sm p-2 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/profile" && location.startsWith("/profile"));
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-3 ${
                    isActive
                      ? "gradient-bg text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
