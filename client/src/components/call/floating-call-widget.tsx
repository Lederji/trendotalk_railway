import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Maximize2,
  Minimize2 
} from "lucide-react";

interface FloatingCallWidgetProps {
  caller: {
    username: string;
    avatar?: string;
  };
  onEndCall: () => void;
  callStatus: 'incoming' | 'connecting' | 'connected' | 'ended';
  duration?: number;
  onToggleMute?: () => boolean;
  isMuted?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function FloatingCallWidget({ 
  caller, 
  onEndCall, 
  callStatus,
  duration = 0,
  onToggleMute,
  isMuted = false,
  isMinimized = false,
  onToggleMinimize
}: FloatingCallWidgetProps) {
  const [speakerOn, setSpeakerOn] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = () => {
    if (onToggleMute) {
      onToggleMute();
    }
  };

  const handleToggleSpeaker = () => {
    setSpeakerOn(!speakerOn);
  };

  if (isMinimized) {
    // Minimized floating widget - small bar at top
    return (
      <div 
        className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 flex items-center justify-between shadow-lg cursor-pointer"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <Avatar className="w-8 h-8">
            <AvatarImage src={caller.avatar} alt={caller.username} />
            <AvatarFallback className="bg-green-700 text-white text-xs">
              {caller.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{caller.username}</p>
            <p className="text-xs opacity-80">
              {callStatus === 'connected' ? formatDuration(duration) : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleMute();
            }}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-green-700 w-8 h-8 p-0"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEndCall();
            }}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-red-600 w-8 h-8 p-0"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded floating widget - similar to WhatsApp call interface
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 flex flex-col items-center justify-center z-50 text-white">
      {/* Minimize button */}
      <div className="absolute top-6 left-6">
        <Button
          onClick={onToggleMinimize}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 w-10 h-10 p-0"
        >
          <Minimize2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Caller Info */}
      <div className="text-center mb-8">
        <Avatar className="w-32 h-32 mx-auto mb-4 ring-4 ring-white/20">
          <AvatarImage src={caller.avatar} alt={caller.username} />
          <AvatarFallback className="bg-white/20 text-white text-2xl">
            {caller.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-2xl font-semibold mb-2">{caller.username}</h2>
        <p className="text-lg opacity-80">
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && formatDuration(duration)}
        </p>
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-8">
        {/* Mute Button */}
        <Button
          onClick={handleToggleMute}
          className={`w-16 h-16 rounded-full border-0 ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-white/20 hover:bg-white/30'
          } text-white`}
        >
          {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </Button>

        {/* End Call Button */}
        <Button
          onClick={onEndCall}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
        >
          <PhoneOff className="w-10 h-10" />
        </Button>

        {/* Speaker Button */}
        <Button
          onClick={handleToggleSpeaker}
          className={`w-16 h-16 rounded-full border-0 ${
            speakerOn 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-white/20 hover:bg-white/30'
          } text-white`}
        >
          {speakerOn ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
        </Button>
      </div>
    </div>
  );
}