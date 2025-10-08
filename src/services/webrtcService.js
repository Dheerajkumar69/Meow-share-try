// WebRTC Service for P2P file transfer
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.signalingSocket = null;
    this.roomCode = null;
    this.role = null;
    this.isConnected = false;
    this.p2pTimeout = null;
    this.onStateChange = null;
    this.onFileReceived = null;
    this.onProgress = null;
    
    // Configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      chunkSize: 16 * 1024, // 16KB chunks
      p2pTimeout: 6000, // 6 seconds
      bufferedAmountLowThreshold: 256 * 1024 // 256KB
    };
  }

  // Initialize WebRTC connection
  async initialize(roomCode, role, callbacks = {}) {
    this.roomCode = roomCode;
    this.role = role;
    this.onStateChange = callbacks.onStateChange;
    this.onFileReceived = callbacks.onFileReceived;
    this.onProgress = callbacks.onProgress;

    try {
      // Connect to signaling server
      await this.connectSignaling();
      
      // Create peer connection
      this.createPeerConnection();
      
      // Join room
      this.joinRoom();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      this.notifyStateChange('error', error.message);
      return false;
    }
  }

  // Connect to WebSocket signaling server
  connectSignaling() {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const isProduction = window.location.hostname !== 'localhost';
      const wsUrl = isProduction 
        ? `${protocol}//${window.location.hostname}/signaling`
        : `${protocol}//${window.location.hostname}:8080`;
      
      this.signalingSocket = new WebSocket(wsUrl);
      
      this.signalingSocket.onopen = () => {
        console.log('[WebRTC] Connected to signaling server');
        resolve();
      };
      
      this.signalingSocket.onerror = (error) => {
        console.error('[WebRTC] Signaling connection error:', error);
        reject(error);
      };
      
      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };
      
      this.signalingSocket.onclose = () => {
        console.log('[WebRTC] Signaling connection closed');
        this.notifyStateChange('disconnected');
      };
    });
  }

  // Create RTCPeerConnection
  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice',
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection.connectionState);
      this.notifyStateChange('connection-state', this.peerConnection.connectionState);
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.peerConnection.iceConnectionState);
      this.notifyStateChange('ice-state', this.peerConnection.iceConnectionState);
    };

    // Handle data channel (for receiver)
    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  // Join room via signaling
  joinRoom() {
    this.sendSignalingMessage({
      type: 'join',
      code: this.roomCode,
      role: this.role
    });
  }

  // Handle signaling messages
  handleSignalingMessage(message) {
    console.log('[WebRTC] Received signaling message:', message.type);
    
    switch (message.type) {
      case 'connected':
        console.log('[WebRTC] Connected to signaling server');
        break;
        
      case 'joined':
        this.handleJoined(message);
        break;
        
      case 'offer':
        this.handleOffer(message);
        break;
        
      case 'answer':
        this.handleAnswer(message);
        break;
        
      case 'ice':
        this.handleIceCandidate(message);
        break;
        
      case 'control':
        this.handleControl(message);
        break;
        
      case 'metadata':
        this.handleFileMetadata(message);
        break;
        
      case 'ack':
        this.handleAck(message);
        break;
        
      case 'fallback-ready':
        this.handleFallbackReady(message);
        break;
        
      case 'peer-disconnected':
        this.handlePeerDisconnected(message);
        break;
        
      case 'room-expired':
        this.handleRoomExpired(message);
        break;
        
      case 'error':
        console.error('[WebRTC] Signaling error:', message.error);
        this.notifyStateChange('error', message.error);
        break;
    }
  }

  // Handle room join confirmation
  async handleJoined(message) {
    console.log(`[WebRTC] Joined room ${message.code} as ${message.role}`);
    this.notifyStateChange('joined', message);
    
    if (message.role === 'sender' && message.status === 'ready') {
      // Start P2P timeout
      this.startP2PTimeout();
      
      // Create data channel and initiate offer
      await this.initiateConnection();
    }
  }

  // Initiate WebRTC connection (sender)
  async initiateConnection() {
    try {
      // Create data channel
      this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
        ordered: true,
        reliable: true
      });
      
      this.setupDataChannel(this.dataChannel);
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send offer
      this.sendSignalingMessage({
        type: 'offer',
        sdp: offer
      });
      
      console.log('[WebRTC] Offer sent');
    } catch (error) {
      console.error('[WebRTC] Failed to initiate connection:', error);
      this.notifyStateChange('error', error.message);
    }
  }

  // Handle incoming offer (receiver)
  async handleOffer(message) {
    try {
      await this.peerConnection.setRemoteDescription(message.sdp);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer
      this.sendSignalingMessage({
        type: 'answer',
        sdp: answer
      });
      
      console.log('[WebRTC] Answer sent');
    } catch (error) {
      console.error('[WebRTC] Failed to handle offer:', error);
      this.notifyStateChange('error', error.message);
    }
  }

  // Handle incoming answer (sender)
  async handleAnswer(message) {
    try {
      await this.peerConnection.setRemoteDescription(message.sdp);
      console.log('[WebRTC] Answer received');
    } catch (error) {
      console.error('[WebRTC] Failed to handle answer:', error);
      this.notifyStateChange('error', error.message);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(message) {
    try {
      await this.peerConnection.addIceCandidate(message.candidate);
      console.log('[WebRTC] ICE candidate added');
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
    }
  }

  // Setup data channel
  setupDataChannel(channel) {
    this.dataChannel = channel;
    
    channel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
      this.isConnected = true;
      this.clearP2PTimeout();
      this.notifyStateChange('p2p-connected');
    };
    
    channel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
      this.isConnected = false;
      this.notifyStateChange('p2p-disconnected');
    };
    
    channel.onerror = (error) => {
      console.error('[WebRTC] Data channel error:', error);
      this.notifyStateChange('error', 'Data channel error');
    };
    
    channel.onmessage = (event) => {
      this.handleDataChannelMessage(event);
    };
  }

  // Handle data channel messages
  handleDataChannelMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'file-meta':
          this.handleFileMetadata(message);
          break;
        case 'chunk':
          this.handleFileChunk(message);
          break;
        case 'ack':
          this.handleAck(message);
          break;
        case 'control':
          this.handleControl(message);
          break;
      }
    } catch (error) {
      // Handle binary data (file chunks)
      this.handleBinaryData(event.data);
    }
  }

  // Start P2P timeout
  startP2PTimeout() {
    this.p2pTimeout = setTimeout(() => {
      console.log('[WebRTC] P2P timeout - falling back to server');
      this.notifyStateChange('p2p-timeout');
    }, this.config.p2pTimeout);
  }

  // Clear P2P timeout
  clearP2PTimeout() {
    if (this.p2pTimeout) {
      clearTimeout(this.p2pTimeout);
      this.p2pTimeout = null;
    }
  }

  // Send signaling message
  sendSignalingMessage(message) {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  // Send data channel message
  sendDataChannelMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  // Send binary data
  sendBinaryData(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
    }
  }

  // Notify state change
  notifyStateChange(type, data) {
    if (this.onStateChange) {
      this.onStateChange(type, data);
    }
  }

  // Handle control messages
  handleControl(message) {
    console.log('[WebRTC] Control message:', message);
    this.notifyStateChange('control', message);
  }

  // Handle file metadata
  handleFileMetadata(message) {
    console.log('[WebRTC] File metadata received:', message);
    this.notifyStateChange('file-metadata', message);
  }

  // Handle file chunk
  handleFileChunk(message) {
    console.log('[WebRTC] File chunk received:', message);
    this.notifyStateChange('file-chunk', message);
  }

  // Handle binary data
  handleBinaryData(data) {
    console.log('[WebRTC] Binary data received:', data.byteLength, 'bytes');
    this.notifyStateChange('binary-data', data);
  }

  // Handle acknowledgment
  handleAck(message) {
    console.log('[WebRTC] Acknowledgment received:', message);
    this.notifyStateChange('ack', message);
  }

  // Handle fallback ready
  handleFallbackReady(message) {
    console.log('[WebRTC] Fallback ready:', message);
    this.notifyStateChange('fallback-ready', message);
  }

  // Handle peer disconnected
  handlePeerDisconnected(message) {
    console.log('[WebRTC] Peer disconnected:', message.clientId);
    this.notifyStateChange('peer-disconnected', message);
  }

  // Handle room expired
  handleRoomExpired(message) {
    console.log('[WebRTC] Room expired:', message.code);
    this.notifyStateChange('room-expired', message);
  }

  // Cleanup
  cleanup() {
    this.clearP2PTimeout();
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
    
    this.isConnected = false;
  }
}

export default WebRTCService;
