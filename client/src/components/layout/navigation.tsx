import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, Plus, Users, User, Settings } from "lucide-react";
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

  // Add admin link if user is admin
  const items = user?.isAdmin 
    ? [...navigationItems, { icon: Settings, label: "Admin", href: "/admin" }]
    : navigationItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {items.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/profile" && location.startsWith("/profile"));
          
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className={`w-full flex flex-col items-center gap-1 py-2 px-2 rounded-lg ${
                  isActive 
                    ? "gradient-bg text-white" 
                    : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
