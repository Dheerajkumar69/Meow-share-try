// File Transfer Protocol Implementation

// Use Web Crypto API instead of CryptoJS for better browser compatibility
async function calculateSHA256(data) {
    const buffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export class FileTransferManager {
    constructor(dataChannel, onProgress, onComplete, onError) {
        this.dataChannel = dataChannel;
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.onError = onError;
        
        // Transfer state
        this.isTransferring = false;
        this.isPaused = false;
        this.currentFileIndex = 0;
        this.currentChunkIndex = 0;
        this.pendingChunks = new Map(); // chunkId -> chunk data
        this.receivedChunks = new Map(); // fileId -> Map(chunkIndex -> chunk)
        this.fileMetadata = new Map(); // fileId -> metadata
        this.completedFiles = new Map(); // fileId -> Blob
        
        // Progress tracking
        this.totalBytes = 0;
        this.transferredBytes = 0;
        this.startTime = 0;
        this.lastProgressUpdate = 0;
        
        // Backpressure management
        this.maxConcurrentChunks = 32;
        this.sentChunks = 0;
        this.ackedChunks = 0;
        
        // Retry logic
        this.maxRetries = 3;
        this.chunkRetries = new Map(); // chunkId -> retryCount
    }
    
    // SENDER METHODS
    
    async sendFiles(files) {
        if (this.isTransferring) {
            throw new Error('Transfer already in progress');
        }
        
        this.isTransferring = true;
        this.startTime = Date.now();
        this.totalBytes = files.reduce((sum, file) => sum + file.size, 0);
        this.transferredBytes = 0;
        this.currentFileIndex = 0;
        
        try {
            // Generate file IDs upfront for consistency
            const fileInfos = files.map((file, index) => ({
                file,
                fileId: `file_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                index
            }));
            
            // Send all file metadata first
            for (const fileInfo of fileInfos) {
                await this.sendFileMetadata(fileInfo.file, fileInfo.fileId, fileInfo.index);
            }
            
            // Send files one by one
            for (const fileInfo of fileInfos) {
                this.currentFileIndex = fileInfo.index;
                await this.sendSingleFile(fileInfo.file, fileInfo.fileId, fileInfo.index);
            }
            
            // Send completion signal
            this.sendControlMessage({
                type: 'transfer-complete',
                timestamp: Date.now()
            });
            
            this.isTransferring = false;
            this.onComplete(true); // true = sender
            
        } catch (error) {
            this.isTransferring = false;
            this.onError(error);
        }
    }
    
    async sendFileMetadata(file, fileId, fileIndex) {
        const chunkSize = 16 * 1024; // Use constant instead of CONFIG
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        // Calculate SHA-256 hash
        const hash = await this.calculateFileHash(file);
        
        const metadata = {
            type: 'file-metadata',
            fileId: fileId,
            filename: file.name,
            size: file.size,
            mimeType: file.type,
            chunkSize: chunkSize,
            totalChunks: totalChunks,
            sha256: hash,
            fileIndex: fileIndex
        };
        
        this.sendControlMessage(metadata);
        
        return { fileId, metadata };
    }
    
    async sendSingleFile(file, fileId, fileIndex) {
        const chunkSize = 16 * 1024; // Use constant instead of CONFIG
        const totalChunks = Math.ceil(file.size / chunkSize);
        
        this.currentChunkIndex = 0;
        
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            // Check for backpressure
            while (this.dataChannel.bufferedAmount >= 256 * 1024) { // Use constant
                await this.waitForBufferLow();
            }
            
            // Check if we've sent too many unacknowledged chunks
            while (this.sentChunks - this.ackedChunks >= this.maxConcurrentChunks) {
                await this.waitForAcknowledgment();
            }
            
            if (this.isPaused) {
                await this.waitForResume();
            }
            
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunkData = file.slice(start, end);
            
            await this.sendChunk(fileId, chunkIndex, chunkData);
            
            this.currentChunkIndex = chunkIndex;
            this.transferredBytes += chunkData.size;
            
            // Update progress
            this.updateProgress();
        }
    }
    
    async sendChunk(fileId, chunkIndex, chunkData) {
        const chunkId = `${fileId}_${chunkIndex}`;
        
        // Send chunk header first
        this.sendControlMessage({
            type: 'chunk-header',
            fileId: fileId,
            chunkIndex: chunkIndex,
            chunkId: chunkId,
            size: chunkData.size
        });
        
        // Convert chunk to ArrayBuffer and send
        const arrayBuffer = await chunkData.arrayBuffer();
        this.dataChannel.send(arrayBuffer);
        
        this.sentChunks++;
        this.pendingChunks.set(chunkId, { fileId, chunkIndex, data: chunkData });
        
        // Set retry timeout
        setTimeout(() => {
            if (this.pendingChunks.has(chunkId)) {
                this.retryChunk(chunkId);
            }
        }, 10000); // 10 second timeout
    }
    
    async retryChunk(chunkId) {
        if (!this.pendingChunks.has(chunkId)) return;
        
        const retryCount = (this.chunkRetries.get(chunkId) || 0) + 1;
        
        if (retryCount > this.maxRetries) {
            this.onError(new Error(`Chunk ${chunkId} failed after ${this.maxRetries} retries`));
            return;
        }
        
        this.chunkRetries.set(chunkId, retryCount);
        const chunkInfo = this.pendingChunks.get(chunkId);
        
        console.log(`Retrying chunk ${chunkId} (attempt ${retryCount})`);
        await this.sendChunk(chunkInfo.fileId, chunkInfo.chunkIndex, chunkInfo.data);
    }
    
    // RECEIVER METHODS
    
    handleDataChannelMessage(data) {
        if (typeof data === 'string') {
            // Control message
            try {
                const message = JSON.parse(data);
                this.handleControlMessage(message);
            } catch (error) {
                console.error('Error parsing control message:', error);
            }
        } else if (data instanceof ArrayBuffer) {
            // Binary chunk data
            this.handleBinaryChunk(data);
        }
    }
    
    handleControlMessage(message) {
        switch (message.type) {
            case 'file-metadata':
                this.handleFileMetadata(message);
                break;
                
            case 'chunk-header':
                this.handleChunkHeader(message);
                break;
                
            case 'chunk-ack':
                this.handleChunkAck(message);
                break;
                
            case 'transfer-complete':
                this.handleTransferComplete();
                break;
                
            default:
                console.log('Unknown control message:', message.type);
        }
    }
    
    handleFileMetadata(metadata) {
        this.fileMetadata.set(metadata.fileId, metadata);
        this.receivedChunks.set(metadata.fileId, new Map());
        
        // Update UI with incoming file info
        this.onProgress({
            type: 'file-metadata',
            fileId: metadata.fileId,
            filename: metadata.filename,
            size: metadata.size,
            mimeType: metadata.mimeType
        });
        
        console.log(`Received metadata for file: ${metadata.filename} (${this.formatBytes(metadata.size)})`);
    }
    
    currentChunkHeader = null;
    
    handleChunkHeader(header) {
        this.currentChunkHeader = header;
        // Wait for binary data to arrive
    }
    
    handleBinaryChunk(arrayBuffer) {
        if (!this.currentChunkHeader) {
            console.error('Received binary chunk without header');
            return;
        }
        
        const header = this.currentChunkHeader;
        this.currentChunkHeader = null;
        
        // Store chunk
        const fileChunks = this.receivedChunks.get(header.fileId);
        if (fileChunks) {
            fileChunks.set(header.chunkIndex, arrayBuffer);
            
            // Send acknowledgment
            this.sendAcknowledgment(header.chunkId);
            
            // Update progress
            this.transferredBytes += arrayBuffer.byteLength;
            this.updateProgress();
            
            // Check if file is complete
            const metadata = this.fileMetadata.get(header.fileId);
            if (metadata && fileChunks.size === metadata.totalChunks) {
                this.assembleFile(header.fileId);
            }
        }
    }
    
    sendAcknowledgment(chunkId) {
        this.sendControlMessage({
            type: 'chunk-ack',
            chunkId: chunkId,
            timestamp: Date.now()
        });
    }
    
    handleChunkAck(ack) {
        if (this.pendingChunks.has(ack.chunkId)) {
            this.pendingChunks.delete(ack.chunkId);
            this.chunkRetries.delete(ack.chunkId);
            this.ackedChunks++;
        }
    }
    
    async assembleFile(fileId) {
        const metadata = this.fileMetadata.get(fileId);
        const chunks = this.receivedChunks.get(fileId);
        
        if (!metadata || !chunks) {
            console.error('Missing metadata or chunks for file:', fileId);
            return;
        }
        
        // Assemble chunks in order
        const orderedChunks = [];
        for (let i = 0; i < metadata.totalChunks; i++) {
            const chunk = chunks.get(i);
            if (!chunk) {
                console.error(`Missing chunk ${i} for file ${fileId}`);
                return;
            }
            orderedChunks.push(chunk);
        }
        
        // Create blob
        const blob = new Blob(orderedChunks, { type: metadata.mimeType });
        
        // Verify integrity
        const calculatedHash = await this.calculateBlobHash(blob);
        if (calculatedHash !== metadata.sha256) {
            console.error('File integrity check failed:', fileId);
            this.onError(new Error(`File integrity check failed: ${metadata.filename}`));
            return;
        }
        
        // File is complete and verified
        this.completedFiles.set(fileId, blob);
        
        this.onProgress({
            type: 'file-complete',
            fileId: fileId,
            filename: metadata.filename,
            blob: blob,
            downloadUrl: URL.createObjectURL(blob)
        });
        
        console.log(`File completed: ${metadata.filename}`);
    }
    
    handleTransferComplete() {
        this.isTransferring = false;
        this.onComplete(false); // false = receiver
    }
    
    // UTILITY METHODS
    
    sendControlMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }
    
    async calculateFileHash(file) {
        return await calculateSHA256(file);
    }
    
    async calculateBlobHash(blob) {
        return await calculateSHA256(blob);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    updateProgress() {
        const now = Date.now();
        if (now - this.lastProgressUpdate < 100) return; // Throttle updates
        
        this.lastProgressUpdate = now;
        const elapsed = (now - this.startTime) / 1000;
        const speed = elapsed > 0 ? this.transferredBytes / elapsed : 0;
        const percentage = this.totalBytes > 0 ? (this.transferredBytes / this.totalBytes) * 100 : 0;
        
        this.onProgress({
            type: 'progress',
            percentage: Math.min(percentage, 100),
            transferredBytes: this.transferredBytes,
            totalBytes: this.totalBytes,
            speed: speed,
            elapsed: elapsed
        });
    }
    
    async waitForBufferLow() {
        return new Promise((resolve) => {
            if (this.dataChannel.bufferedAmount < 256 * 1024) { // Use constant
                resolve();
                return;
            }
            
            const checkBuffer = () => {
                if (this.dataChannel.bufferedAmount < 256 * 1024) { // Use constant
                    resolve();
                } else {
                    setTimeout(checkBuffer, 50);
                }
            };
            
            checkBuffer();
        });
    }
    
    async waitForAcknowledgment() {
        return new Promise((resolve) => {
            const checkAcks = () => {
                if (this.sentChunks - this.ackedChunks < this.maxConcurrentChunks) {
                    resolve();
                } else {
                    setTimeout(checkAcks, 100);
                }
            };
            
            checkAcks();
        });
    }
    
    async waitForResume() {
        return new Promise((resolve) => {
            const checkPause = () => {
                if (!this.isPaused) {
                    resolve();
                } else {
                    setTimeout(checkPause, 100);
                }
            };
            
            checkPause();
        });
    }
    
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    cancel() {
        this.isTransferring = false;
        this.isPaused = false;
        this.pendingChunks.clear();
        this.receivedChunks.clear();
        this.fileMetadata.clear();
        this.completedFiles.clear();
        this.chunkRetries.clear();
    }
}

// Global CONFIG reference will be passed from main.js