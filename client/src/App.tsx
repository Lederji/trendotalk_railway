import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Home from "@/pages/home";
import Trends from "@/pages/trends";
import Create from "@/pages/create";
import Circle from "@/pages/circle";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import SearchPage from "@/pages/search";
import ChatPage from "@/pages/chat";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trends" component={Trends} />
      <Route path="/create" component={Create} />
      <Route path="/circle" component={Circle} />
      <Route path="/circle/add-vibe" component={() => {
        // Temporary placeholder for Circle Add Vibe page
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Add to Circle Vibe</h1>
              <p className="text-gray-300 mb-6">Feature coming soon!</p>
              <button 
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }} />
      <Route path="/chats" component={() => {
        // Temporary placeholder for Chats page
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Circle Chats</h1>
              <p className="text-gray-300 mb-6">Feature coming soon!</p>
              <button 
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }} />
      <Route path="/chat/:chatId" component={ChatPage} />
      <Route path="/profile/:username?" component={Profile} />
      <Route path="/search" component={SearchPage} />
      <Route path="/auth" component={Auth} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
