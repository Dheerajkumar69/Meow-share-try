// P2P File Transfer Protocol
import WebRTCService from './webrtcService.js';

class P2PFileTransfer {
  constructor() {
    this.webrtc = new WebRTCService();
    this.files = new Map(); // fileId -> file data
    this.chunks = new Map(); // fileId -> chunks array
    this.acknowledgments = new Map(); // fileId -> ack status
    this.transferStats = new Map(); // fileId -> stats
    
    // Configuration
    this.config = {
      chunkSize: 16 * 1024, // 16KB
      ackInterval: 32, // Send ack every 32 chunks
      maxRetries: 3,
      retryTimeout: 10000, // 10 seconds
      bufferedAmountLowThreshold: 256 * 1024 // 256KB
    };
    
    // Callbacks
    this.onProgress = null;
    this.onFileComplete = null;
    this.onError = null;
    this.onStateChange = null;
  }

  // Initialize P2P file transfer
  async initialize(roomCode, role, callbacks = {}) {
    this.onProgress = callbacks.onProgress;
    this.onFileComplete = callbacks.onFileComplete;
    this.onError = callbacks.onError;
    this.onStateChange = callbacks.onStateChange;

    // Initialize WebRTC
    await this.webrtc.initialize(roomCode, role, {
      onStateChange: this.handleWebRTCStateChange.bind(this),
      onFileReceived: this.handleFileReceived.bind(this),
      onProgress: this.handleProgress.bind(this)
    });

    return true;
  }

  // Handle WebRTC state changes
  handleWebRTCStateChange(type, data) {
    switch (type) {
      case 'p2p-connected':
        this.onStateChange?.('p2p-ready');
        break;
      case 'p2p-timeout':
        this.onStateChange?.('p2p-timeout');
        break;
      case 'error':
        this.onError?.(data);
        break;
      case 'file-metadata':
        this.handleFileMetadata(data);
        break;
      case 'binary-data':
        this.handleBinaryData(data);
        break;
      case 'ack':
        this.handleAcknowledgment(data);
        break;
    }
  }

  // Send files over P2P
  async sendFiles(files) {
    if (!this.webrtc.isConnected) {
      throw new Error('P2P connection not established');
    }

    for (const file of files) {
      await this.sendFile(file);
    }
  }

  // Send a single file
  async sendFile(file) {
    const fileId = this.generateFileId();
    const fileData = await this.readFileAsArrayBuffer(file);
    const chunks = this.chunkFile(fileData);
    const sha256 = await this.calculateSHA256(fileData);
    
    // Store file data
    this.files.set(fileId, {
      file,
      data: fileData,
      chunks,
      sha256,
      totalChunks: chunks.length,
      sentChunks: 0
    });

    // Initialize transfer stats
    this.transferStats.set(fileId, {
      bytesSent: 0,
      totalBytes: fileData.byteLength,
      startTime: Date.now(),
      chunksSent: 0,
      chunksAcked: 0
    });

    // Send file metadata
    this.sendFileMetadata(fileId, file, fileData.byteLength, chunks.length, sha256);
    
    // Start sending chunks
    this.sendFileChunks(fileId);
  }

  // Send file metadata
  sendFileMetadata(fileId, file, sizeBytes, totalChunks, sha256) {
    const metadata = {
      type: 'file-meta',
      fileId,
      filename: file.name,
      sizeBytes,
      chunkSize: this.config.chunkSize,
      totalChunks,
      sha256,
      mimeType: file.type
    };

    this.webrtc.sendDataChannelMessage(metadata);
    console.log(`[P2P] Sent file metadata: ${file.name} (${sizeBytes} bytes, ${totalChunks} chunks)`);
  }

  // Send file chunks with backpressure
  async sendFileChunks(fileId) {
    const fileData = this.files.get(fileId);
    if (!fileData) return;

    const { chunks } = fileData;
    let chunkIndex = 0;

    while (chunkIndex < chunks.length) {
      // Check backpressure
      if (this.webrtc.dataChannel.bufferedAmount >= this.config.bufferedAmountLowThreshold) {
        console.log('[P2P] Backpressure - waiting for buffer to clear');
        await this.waitForBufferClear();
        continue;
      }

      // Send chunk
      const chunk = chunks[chunkIndex];
      this.sendChunk(fileId, chunkIndex, chunk);
      
      chunkIndex++;
      fileData.sentChunks++;
      
      // Update progress
      this.updateProgress(fileId);
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }

  // Send a single chunk
  sendChunk(fileId, chunkIndex, chunkData) {
    // Send chunk header
    const header = {
      type: 'chunk',
      fileId,
      chunkIndex,
      totalChunks: this.files.get(fileId).totalChunks
    };
    
    this.webrtc.sendDataChannelMessage(header);
    
    // Send binary data
    this.webrtc.sendBinaryData(chunkData);
    
    console.log(`[P2P] Sent chunk ${chunkIndex} for file ${fileId}`);
  }

  // Wait for buffer to clear
  waitForBufferClear() {
    return new Promise((resolve) => {
      const checkBuffer = () => {
        if (this.webrtc.dataChannel.bufferedAmount < this.config.bufferedAmountLowThreshold) {
          resolve();
        } else {
          setTimeout(checkBuffer, 10);
        }
      };
      checkBuffer();
    });
  }

  // Handle file metadata (receiver)
  handleFileMetadata(metadata) {
    const { fileId, filename, sizeBytes, totalChunks, sha256, mimeType } = metadata;
    
    console.log(`[P2P] Received file metadata: ${filename} (${sizeBytes} bytes, ${totalChunks} chunks)`);
    
    // Initialize file reception
    this.files.set(fileId, {
      filename,
      sizeBytes,
      totalChunks,
      sha256,
      mimeType,
      chunks: new Array(totalChunks),
      receivedChunks: 0
    });
    
    this.acknowledgments.set(fileId, {
      lastAcked: -1,
      pendingChunks: new Set()
    });
    
    this.transferStats.set(fileId, {
      bytesReceived: 0,
      totalBytes: sizeBytes,
      startTime: Date.now(),
      chunksReceived: 0
    });
  }

  // Handle binary data (receiver)
  handleBinaryData(data) {
    // This will be handled by the chunk reassembly logic
    // For now, we'll assume chunks come in order
    console.log(`[P2P] Received binary data: ${data.byteLength} bytes`);
  }

  // Handle file received (receiver)
  handleFileReceived(fileId, fileData) {
    console.log(`[P2P] File received: ${fileId}`);
    this.onFileComplete?.(fileId, fileData);
  }

  // Handle progress updates
  handleProgress(fileId, progress) {
    this.onProgress?.(fileId, progress);
  }

  // Handle acknowledgments
  handleAcknowledgment(ack) {
    const { fileId, chunkIndex } = ack;
    const fileData = this.files.get(fileId);
    
    if (fileData) {
      fileData.receivedChunks++;
      this.updateProgress(fileId);
      
      // Check if file is complete
      if (fileData.receivedChunks >= fileData.totalChunks) {
        this.reassembleFile(fileId);
      }
    }
  }

  // Reassemble file from chunks
  async reassembleFile(fileId) {
    const fileData = this.files.get(fileId);
    if (!fileData) return;

    try {
      // Combine chunks
      const chunks = fileData.chunks;
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const combined = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Verify SHA256
      const receivedHash = await this.calculateSHA256(combined.buffer);
      if (receivedHash !== fileData.sha256) {
        throw new Error('File integrity check failed');
      }

      // Create file object
      const blob = new Blob([combined], { type: fileData.mimeType });
      const file = new File([blob], fileData.filename, { type: fileData.mimeType });
      
      console.log(`[P2P] File reassembled: ${fileData.filename}`);
      this.handleFileReceived(fileId, file);
      
    } catch (error) {
      console.error(`[P2P] Failed to reassemble file ${fileId}:`, error);
      this.onError?.(error);
    }
  }

  // Update progress
  updateProgress(fileId) {
    const fileData = this.files.get(fileId);
    const stats = this.transferStats.get(fileId);
    
    if (fileData && stats) {
      const progress = {
        fileId,
        filename: fileData.filename,
        bytesTransferred: stats.bytesReceived || stats.bytesSent,
        totalBytes: stats.totalBytes,
        percentage: Math.round((stats.bytesReceived || stats.bytesSent) / stats.totalBytes * 100),
        chunksTransferred: stats.chunksReceived || stats.chunksSent,
        totalChunks: fileData.totalChunks
      };
      
      this.onProgress?.(fileId, progress);
    }
  }

  // Generate file ID
  generateFileId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Read file as ArrayBuffer
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Chunk file data
  chunkFile(data) {
    const chunks = [];
    const chunkSize = this.config.chunkSize;
    
    for (let i = 0; i < data.byteLength; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  // Calculate SHA256 hash
  async calculateSHA256(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Cleanup
  cleanup() {
    this.webrtc.cleanup();
    this.files.clear();
    this.chunks.clear();
    this.acknowledgments.clear();
    this.transferStats.clear();
  }
}

export default P2PFileTransfer;
