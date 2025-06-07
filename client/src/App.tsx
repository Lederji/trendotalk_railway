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
import ChatNew from "@/pages/chat-new";
import AdminDashboard from "@/pages/admin-dashboard";
import PostDetail from "@/pages/PostDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trends" component={Trends} />
      <Route path="/create" component={Create} />
      <Route path="/circle" component={Circle} />
      <Route path="/circle/add-vibe" component={Circle} />
      <Route path="/chats" component={ChatNew} />
      <Route path="/chat/:chatId" component={ChatPage} />
      <Route path="/profile/:userId?" component={Profile} />
      <Route path="/users/:userId" component={Profile} />
      <Route path="/post/:postId" component={PostDetail} />
      <Route path="/search" component={SearchPage} />
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={Auth} />
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
