import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CallInterfaceProps {
  isIncoming: boolean;
  caller: {
    username: string;
    avatar?: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  onEndCall: () => void;
  callStatus: 'incoming' | 'connecting' | 'connected' | 'ended';
  duration?: number;
}

export function CallInterface({ 
  isIncoming, 
  caller, 
  onAccept, 
  onDecline, 
  onEndCall, 
  callStatus,
  duration = 0 
}: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const { toast } = useToast();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone on" : "Microphone off",
      description: isMuted ? "You can now speak" : "You are now muted",
    });
  };

  const handleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    toast({
      title: isSpeakerOn ? "Speaker off" : "Speaker on",
      description: isSpeakerOn ? "Audio through earpiece" : "Audio through speaker",
    });
  };

  if (callStatus === 'ended') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 flex flex-col items-center justify-center z-50 text-white">
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
          {callStatus === 'incoming' && isIncoming && 'Incoming call...'}
          {callStatus === 'incoming' && !isIncoming && 'Calling...'}
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && formatDuration(duration)}
        </p>
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center space-x-6">
        {/* Incoming Call Controls */}
        {callStatus === 'incoming' && isIncoming && (
          <>
            <Button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <Button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white border-0"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Active Call Controls */}
        {(callStatus === 'connecting' || callStatus === 'connected') && (
          <>
            <Button
              onClick={handleMute}
              className={`w-14 h-14 rounded-full border-0 ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              onClick={handleSpeaker}
              className={`w-14 h-14 rounded-full border-0 ${
                isSpeakerOn 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </Button>

            <Button
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
          </>
        )}

        {/* Outgoing Call Controls */}
        {callStatus === 'incoming' && !isIncoming && (
          <Button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>
        )}
      </div>

      {/* Connection Animation */}
      {callStatus === 'connecting' && (
        <div className="mt-8 flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}
    </div>
  );
}