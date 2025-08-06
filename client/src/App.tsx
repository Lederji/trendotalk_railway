import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { FloatingCallWidget } from "@/components/call/floating-call-widget";
import { CallInterface } from "@/components/call/call-interface";
import { useCallState } from "@/hooks/use-call-state";
import { useWebRTCCall } from "@/hooks/use-webrtc-call";
import HomePage from "@/pages/home";
import Trends from "@/pages/trends";
import Create from "@/pages/create";
import Circle from "@/pages/circle";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import { SearchPage } from "@/pages/search";
import ChatPage from "@/pages/chat";
import ChatNew from "@/pages/chat-new";
import DMChatPage from "@/pages/dm-chat";
import AdminDashboard from "@/pages/admin-dashboard";
import PostDetail from "@/pages/PostDetail";
import NotFound from "@/pages/not-found";
import AccountCenter from "@/pages/account-center";
import CVPage from "@/pages/cv";
import { Messages } from "@/pages/messages";
import BannedPage from "@/pages/banned";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/trends" component={Trends} />
      <Route path="/create" component={Create} />
      <Route path="/circle" component={Circle} />
      <Route path="/circle/add-vibe" component={Circle} />
      <Route path="/chats" component={ChatNew} />
      <Route path="/chat/:chatId" component={ChatPage} />
      <Route path="/dm/:chatId" component={DMChatPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/profile/:userId?" component={Profile} />
      <Route path="/users/:userId" component={Profile} />
      <Route path="/post/:postId" component={PostDetail} />
      <Route path="/search" component={SearchPage} />
      <Route path="/account-center" component={AccountCenter} />
      <Route path="/cv" component={CVPage} />
      <Route path="/cv/:userId" component={CVPage} />
      <Route path="/auth" component={Auth} />
      <Route path="/login" component={Auth} />
      <Route path="/banned" component={BannedPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalCallWidget() {
  const { 
    isCallActive, 
    isIncoming, 
    callStatus, 
    caller, 
    duration, 
    isMuted, 
    isMinimized,
    setMinimized 
  } = useCallState();
  
  const { acceptCall, declineCall, endCall, toggleMute } = useWebRTCCall();

  if (!isCallActive || !caller) {
    return null;
  }

  // Show full call interface for incoming calls or when not minimized
  if ((isIncoming && callStatus === 'incoming') || !isMinimized) {
    return (
      <CallInterface
        isIncoming={isIncoming}
        caller={caller}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEndCall={endCall}
        callStatus={callStatus}
        duration={duration}
        onToggleMute={toggleMute}
        isMuted={isMuted}
        onMinimize={() => setMinimized(true)}
      />
    );
  }

  // Show floating widget for active calls that are minimized
  return (
    <FloatingCallWidget
      caller={caller}
      onEndCall={endCall}
      callStatus={callStatus}
      duration={duration}
      onToggleMute={toggleMute}
      isMuted={isMuted}
      isMinimized={isMinimized}
      onToggleMinimize={() => setMinimized(false)}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <GlobalCallWidget />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
