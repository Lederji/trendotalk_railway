import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CallState {
  isCallActive: boolean;
  isIncoming: boolean;
  callStatus: 'incoming' | 'connecting' | 'connected' | 'ended';
  caller: { username: string; avatar?: string } | null;
  duration: number;
}

export function useWebRTCCall() {
  const [callState, setCallState] = useState<CallState>({
    isCallActive: false,
    isIncoming: false,
    callStatus: 'ended',
    caller: null,
    duration: 0
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // WebSocket connection for signaling
  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for calls');
        // Register user for calls
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
          fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${sessionId}` }
          }).then(res => res.json()).then(user => {
            if (wsRef.current && user.id) {
              wsRef.current.send(JSON.stringify({
                type: 'register',
                userId: user.id.toString(),
                username: user.username
              }));
            }
          }).catch(console.error);
        }
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'incoming-call':
            handleIncomingCall(data);
            break;
          case 'call-accepted':
            await handleCallAccepted();
            break;
          case 'call-declined':
            handleCallDeclined();
            break;
          case 'call-ended':
            handleCallEnded();
            break;
          case 'webrtc-offer':
            await handleWebRTCOffer(data.offer);
            break;
          case 'webrtc-answer':
            await handleWebRTCAnswer(data.answer);
            break;
          case 'webrtc-ice-candidate':
            await handleICECandidate(data.candidate);
            break;
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const createPeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc-ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      // Play remote audio
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play().catch(console.error);
    };

    return peerConnection;
  }, []);

  const startCall = useCallback(async (targetUser: { username: string; avatar?: string }) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      // Send call invitation
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'initiate-call',
          targetUser: targetUser.username
        }));
      }

      setCallState({
        isCallActive: true,
        isIncoming: false,
        callStatus: 'connecting',
        caller: targetUser,
        duration: 0
      });

      toast({
        title: "Calling...",
        description: `Calling ${targetUser.username}`,
      });

    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Call failed",
        description: "Could not access microphone or start call",
        variant: "destructive",
      });
    }
  }, [createPeerConnection, toast]);

  const handleIncomingCall = useCallback((data: any) => {
    setCallState({
      isCallActive: true,
      isIncoming: true,
      callStatus: 'incoming',
      caller: { username: data.caller, avatar: data.callerAvatar },
      duration: 0
    });

    // Play incoming call sound
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      // Fallback: use system notification sound
      console.log('Playing ringtone...');
    });
  }, []);

  const acceptCall = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      
      // Add local stream
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addTrack(track, stream);
        }
      });

      // Send acceptance
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'accept-call'
        }));
      }

      setCallState(prev => ({
        ...prev,
        callStatus: 'connecting'
      }));

    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: "Call failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
      declineCall();
    }
  }, [createPeerConnection, toast]);

  const declineCall = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'decline-call'
      }));
    }
    
    endCall();
  }, []);

  const endCall = useCallback(() => {
    // Clean up streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear duration timer
    if (callDurationRef.current) {
      clearInterval(callDurationRef.current);
      callDurationRef.current = null;
    }

    // Send end call signal
    if (wsRef.current && callState.isCallActive) {
      wsRef.current.send(JSON.stringify({
        type: 'end-call'
      }));
    }

    setCallState({
      isCallActive: false,
      isIncoming: false,
      callStatus: 'ended',
      caller: null,
      duration: 0
    });
  }, [callState.isCallActive]);

  const handleCallAccepted = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      // Create and send offer
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc-offer',
          offer
        }));
      }

      setCallState(prev => ({
        ...prev,
        callStatus: 'connecting'
      }));

    } catch (error) {
      console.error('Error handling call acceptance:', error);
      endCall();
    }
  }, [endCall]);

  const handleCallDeclined = useCallback(() => {
    toast({
      title: "Call declined",
      description: "The user declined your call",
    });
    endCall();
  }, [endCall, toast]);

  const handleCallEnded = useCallback(() => {
    toast({
      title: "Call ended",
      description: "The call has been ended",
    });
    endCall();
  }, [endCall, toast]);

  const handleWebRTCOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc-answer',
          answer
        }));
      }

      // Start call duration timer
      setCallState(prev => ({
        ...prev,
        callStatus: 'connected'
      }));

      startCallTimer();

    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      endCall();
    }
  }, [endCall]);

  const handleWebRTCAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(answer);
      
      setCallState(prev => ({
        ...prev,
        callStatus: 'connected'
      }));

      startCallTimer();

    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      endCall();
    }
  }, [endCall]);

  const handleICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }, []);

  const startCallTimer = useCallback(() => {
    callDurationRef.current = setInterval(() => {
      setCallState(prev => ({
        ...prev,
        duration: prev.duration + 1
      }));
    }, 1000);
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return !audioTracks[0]?.enabled;
    }
    return false;
  }, []);

  return {
    callState,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute
  };
}