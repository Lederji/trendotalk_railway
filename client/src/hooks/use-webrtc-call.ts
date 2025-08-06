import { useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCallState } from '@/hooks/use-call-state';
import { requestMicrophonePermission, showPermissionAlert } from '@/utils/permissions';

export function useWebRTCCall() {
  const {
    isCallActive,
    isIncoming,
    callStatus,
    caller,
    duration,
    isMuted,
    setCallActive,
    setIncoming,
    setCallStatus,
    setCaller,
    setDuration,
    setMuted,
    setMinimized,
    resetCall
  } = useCallState();

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
      // First check and request microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        toast({
          title: "Call failed",
          description: "Could not access microphone or start call",
          variant: "destructive"
        });
        showPermissionAlert();
        return;
      }

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

      setCallActive(true);
      setIncoming(false);
      setCallStatus('connecting');
      setCaller(targetUser);
      setDuration(0);
      setMuted(false);
      setMinimized(false);

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
    setCallActive(true);
    setIncoming(true);
    setCallStatus('incoming');
    setCaller({ username: data.caller, avatar: data.callerAvatar });
    setDuration(0);
    setMuted(false);
    setMinimized(false);

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
      // First check and request microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        toast({
          title: "Call failed",
          description: "Could not access microphone",
          variant: "destructive"
        });
        showPermissionAlert();
        declineCall();
        return;
      }

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

      setCallStatus('connecting');

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
    if (wsRef.current && isCallActive) {
      wsRef.current.send(JSON.stringify({
        type: 'end-call'
      }));
    }

    resetCall();
  }, [isCallActive, resetCall]);

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

      setCallStatus('connecting');

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
      setCallStatus('connected');

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
      
      setCallStatus('connected');

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
      setDuration(duration + 1);
    }, 1000);
  }, [duration, setDuration]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current && peerConnectionRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      
      if (audioTracks.length > 0) {
        const newMutedState = !audioTracks[0].enabled;
        
        // Disable/enable all audio tracks in the local stream
        audioTracks.forEach(track => {
          track.enabled = !newMutedState;
        });
        
        // Also control the audio tracks being sent through peer connection
        const senders = peerConnectionRef.current.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = !newMutedState;
          }
        });
        
        // Update call state with mute status
        setMuted(newMutedState);
        
        return newMutedState;
      }
    }
    return false;
  }, []);

  return {
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute
  };
}