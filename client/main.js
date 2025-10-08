import { FileTransferManager } from './fileTransfer.js';

import { FileTransferManager } from './fileTransfer.js';
import QRCode from 'qrcode';

// Configuration
const CONFIG = {
    SERVER_URL: window.location.hostname === 'localhost' 
        ? 'ws://localhost:8080' 
        : `wss://${window.location.hostname.replace('your-frontend', 'your-backend')}`,
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:8080/api' 
        : `https://${window.location.hostname.replace('your-frontend', 'your-backend')}/api`,
    STUN_SERVERS: ['stun:stun.l.google.com:19302'],
    CHUNK_SIZE: 16 * 1024, // 16 KB
    P2P_TIMEOUT: 6000, // 6 seconds
    MAX_FILE_SIZE: 25 * 1024 * 1024, // 25 MB
    MAX_SESSION_SIZE: 200 * 1024 * 1024, // 200 MB
    BUFFER_LOW_THRESHOLD: 256 * 1024 // 256 KB
};

// Global state
let currentSession = null;
let websocket = null;
let peerConnection = null;
let dataChannel = null;
let currentRole = null;
let selectedFiles = [];
let isTransferring = false;
let fileTransferManager = null;
let transferStats = {
    startTime: 0,
    bytesTransferred: 0,
    totalBytes: 0,
    speed: 0
};

// DOM elements
const homeScreen = document.getElementById('home-screen');
const senderScreen = document.getElementById('sender-screen');
const receiverScreen = document.getElementById('receiver-screen');
const errorModal = document.getElementById('error-modal');
const qrModal = document.getElementById('qr-modal');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Check for auto-join from QR code
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    
    if (joinCode && /^[A-F0-9]{6}$/.test(joinCode)) {
        // Auto-fill the join code and switch to receiver screen
        showScreen('receiver');
        document.getElementById('session-code-input').value = joinCode;
        // Don't auto-join immediately, let user confirm
        updateReceiverStatus('Ready to join session ' + joinCode, '📱');
    } else {
        showScreen('home');
    }
});

function setupEventListeners() {
    // Home screen
    document.getElementById('create-session-btn').addEventListener('click', createSession);
    document.getElementById('join-session-btn').addEventListener('click', () => showScreen('receiver'));
    
    // Sender screen
    document.getElementById('file-input').addEventListener('change', handleFileSelection);
    document.getElementById('file-drop-zone').addEventListener('dragover', handleDragOver);
    document.getElementById('file-drop-zone').addEventListener('drop', handleFileDrop);
    document.getElementById('copy-code-btn').addEventListener('click', copySessionCode);
    document.getElementById('show-qr-btn').addEventListener('click', showQRCode);
    document.getElementById('start-transfer-btn').addEventListener('click', startTransfer);
    document.getElementById('cancel-session-btn').addEventListener('click', cancelSession);
    
    // Receiver screen
    document.getElementById('session-code-input').addEventListener('input', handleCodeInput);
    document.getElementById('join-btn').addEventListener('click', joinSession);
    document.getElementById('back-to-home-btn').addEventListener('click', () => showScreen('home'));
    
    // Modals
    document.getElementById('close-error-btn').addEventListener('click', closeErrorModal);
    document.getElementById('close-qr-btn').addEventListener('click', closeQRModal);
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    switch (screenName) {
        case 'home':
            homeScreen.classList.add('active');
            break;
        case 'sender':
            senderScreen.classList.add('active');
            break;
        case 'receiver':
            receiverScreen.classList.add('active');
            break;
    }
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    errorModal.style.display = 'flex';
}

function closeErrorModal() {
    errorModal.style.display = 'none';
}

function closeQRModal() {
    qrModal.style.display = 'none';
}

// Session Management
async function createSession() {
    try {
        updateStatus('Creating session...', '⏳');
        
        const response = await secureApiCall(`${CONFIG.API_URL}/session/create`, {
            method: 'POST'
        });
        
        const data = await response.json();
        currentSession = data.session;
        currentRole = 'sender';
        
        document.getElementById('session-code').textContent = currentSession.code;
        showScreen('sender');
        
        // Connect to signaling server
        connectWebSocket();
        
        updateStatus('Waiting for receiver...', '⏳');
        
    } catch (error) {
        console.error('Session creation error:', error);
        showError(error.message || 'Failed to create session. Please try again.');
    }
}

async function joinSession() {
    const code = document.getElementById('session-code-input').value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
        showError('Please enter a valid 6-character code');
        return;
    }
    
    // Validate hex code format
    if (!/^[A-F0-9]{6}$/.test(code)) {
        showError('Code must contain only letters A-F and numbers 0-9');
        return;
    }
    
    try {
        updateReceiverStatus('Checking session...', '⏳');
        
        // Verify session exists
        const response = await secureApiCall(`${CONFIG.API_URL}/session/${code}`);
        const data = await response.json();
        
        currentSession = data.session;
        currentRole = 'receiver';
        
        // Connect to signaling server
        connectWebSocket();
        
        updateReceiverStatus('Connecting to sender...', '⏳');
        
    } catch (error) {
        console.error('Join session error:', error);
        showError(error.message || 'Session not found or expired. Please check the code.');
    }
}

// WebSocket Connection
function connectWebSocket() {
    if (websocket) {
        websocket.close();
    }
    
    websocket = new WebSocket(CONFIG.SERVER_URL);
    
    websocket.onopen = () => {
        console.log('WebSocket connected');
        // Join room
        websocket.send(JSON.stringify({
            type: 'join',
            code: currentSession.code,
            role: currentRole
        }));
    };
    
    websocket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleSignalingMessage(message);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    };
    
    websocket.onclose = () => {
        console.log('WebSocket disconnected');
        if (!isTransferring) {
            setTimeout(() => {
                if (currentSession && !isTransferring) {
                    console.log('Attempting to reconnect...');
                    connectWebSocket();
                }
            }, 2000);
        }
    };
    
    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// WebRTC Signaling
function handleSignalingMessage(message) {
    console.log('Received signaling message:', message.type);
    
    switch (message.type) {
        case 'joined':
            console.log(`Joined room as ${message.role}`);
            break;
            
        case 'peer-joined':
            console.log(`Peer joined as ${message.role}`);
            if (currentRole === 'sender') {
                updateStatus('Receiver connected! Select files to start transfer.', '✅');
                document.getElementById('start-transfer-btn').style.display = 'block';
            }
            break;
            
        case 'offer':
            handleOffer(message);
            break;
            
        case 'answer':
            handleAnswer(message);
            break;
            
        case 'ice':
            handleICECandidate(message);
            break;
            
        case 'control':
            handleControlMessage(message);
            break;
            
        case 'error':
            showError(message.message);
            break;
    }
}

// WebRTC Peer Connection
function createPeerConnection() {
    const config = {
        iceServers: [{ urls: CONFIG.STUN_SERVERS }]
    };
    
    peerConnection = new RTCPeerConnection(config);
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'ice',
                candidate: event.candidate
            }));
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
            updateConnectionStatus('WebRTC connected', '✅');
        } else if (peerConnection.connectionState === 'failed') {
            console.log('P2P connection failed, will fallback to server');
            handleP2PFailure();
        }
    };
    
    if (currentRole === 'sender') {
        // Create data channel
        dataChannel = peerConnection.createDataChannel('fileTransfer', {
            ordered: true,
            maxRetransmits: 3
        });
        
        setupDataChannel(dataChannel);
    } else {
        // Wait for data channel
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannel(dataChannel);
        };
    }
}

function setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    
    // Set buffer amount low threshold for backpressure
    channel.bufferedAmountLowThreshold = CONFIG.BUFFER_LOW_THRESHOLD;
    
    channel.onopen = () => {
        console.log('Data channel opened');
        updateConnectionStatus('Direct P2P connection established', '🚀');
        
        // Initialize file transfer manager
        fileTransferManager = new FileTransferManager(
            channel,
            handleTransferProgress,
            handleTransferComplete,
            handleTransferError
        );
        
        if (currentRole === 'sender') {
            updateStatus('P2P connected! Ready to transfer files.', '🚀');
            document.getElementById('start-transfer-btn').textContent = 'Start P2P Transfer';
        } else {
            updateReceiverStatus('P2P connected! Waiting for files...', '🚀');
        }
        
        // Clear P2P timeout
        if (p2pTimeout) {
            clearTimeout(p2pTimeout);
            p2pTimeout = null;
        }
    };
    
    channel.onclose = () => {
        console.log('Data channel closed');
    };
    
    channel.onerror = (error) => {
        console.error('Data channel error:', error);
        handleP2PFailure();
    };
    
    channel.onmessage = (event) => {
        if (fileTransferManager) {
            fileTransferManager.handleDataChannelMessage(event.data);
        }
    };
    
    channel.onbufferedamountlow = () => {
        // Handled by FileTransferManager
        console.log('Buffer amount low');
    };
}

let p2pTimeout = null;

async function startP2PConnection() {
    createPeerConnection();
    
    // Set P2P timeout
    p2pTimeout = setTimeout(() => {
        console.log('P2P timeout reached, falling back to server');
        handleP2PFailure();
    }, CONFIG.P2P_TIMEOUT);
    
    if (currentRole === 'sender') {
        updateConnectionStatus('Attempting direct P2P connection...', '⏳');
        
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            websocket.send(JSON.stringify({
                type: 'offer',
                sdp: offer.sdp
            }));
            
        } catch (error) {
            console.error('Error creating offer:', error);
            handleP2PFailure();
        }
    }
}

async function handleOffer(message) {
    if (currentRole !== 'receiver') return;
    
    createPeerConnection();
    
    try {
        await peerConnection.setRemoteDescription({
            type: 'offer',
            sdp: message.sdp
        });
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        websocket.send(JSON.stringify({
            type: 'answer',
            sdp: answer.sdp
        }));
        
    } catch (error) {
        console.error('Error handling offer:', error);
        handleP2PFailure();
    }
}

async function handleAnswer(message) {
    if (currentRole !== 'sender') return;
    
    try {
        await peerConnection.setRemoteDescription({
            type: 'answer',
            sdp: message.sdp
        });
    } catch (error) {
        console.error('Error handling answer:', error);
        handleP2PFailure();
    }
}

async function handleICECandidate(message) {
    if (!peerConnection) return;
    
    try {
        await peerConnection.addIceCandidate(message.candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

function handleControlMessage(message) {
    console.log('Control message:', message);
    // Handle control messages like p2p-ready, fallback-ready, etc.
}

function handleP2PFailure() {
    if (p2pTimeout) {
        clearTimeout(p2pTimeout);
        p2pTimeout = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    
    console.log('P2P failed, switching to server fallback');
    
    if (currentRole === 'sender') {
        updateStatus('Direct transfer failed — switching to server fallback.', '⚠️');
        startServerUpload();
    } else {
        updateReceiverStatus('Direct transfer failed — switching to server download.', '⚠️');
        startServerDownload();
    }
}

// File Selection
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    addFilesToSelection(files);
}

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    addFilesToSelection(files);
}

// Rate limiting for API calls
const apiCallLimiter = {
    calls: new Map(),
    
    canMakeCall(endpoint, maxCalls = 10, windowMs = 60000) {
        const now = Date.now();
        const key = endpoint;
        
        if (!this.calls.has(key)) {
            this.calls.set(key, []);
        }
        
        const callTimes = this.calls.get(key);
        
        // Remove old calls outside the window
        const validCalls = callTimes.filter(time => now - time < windowMs);
        this.calls.set(key, validCalls);
        
        if (validCalls.length >= maxCalls) {
            return false;
        }
        
        validCalls.push(now);
        return true;
    }
};

// Secure API wrapper
async function secureApiCall(url, options = {}) {
    // Rate limiting
    if (!apiCallLimiter.canMakeCall(url.split('?')[0])) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
    }
    
    // Add security headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Add CSRF protection if needed
    if (options.method && options.method !== 'GET') {
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Too many requests. Please slow down.');
        }
        if (response.status === 413) {
            throw new Error('File size too large.');
        }
        if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Bad request');
        }
        throw new Error(`Request failed: ${response.status}`);
    }
    
    return response;
}

function addFilesToSelection(files) {
    // Validate files
    const validFiles = [];
    
    for (const file of files) {
        // Check file size
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            showError(`File "${file.name}" is too large (max 25MB)`);
            continue;
        }
        
        // Check file type
        if (!isValidFileType(file.type)) {
            showError(`File type not allowed: ${file.name}`);
            continue;
        }
        
        // Check filename
        if (!isValidFilename(file.name)) {
            showError(`Invalid filename: ${file.name}`);
            continue;
        }
        
        validFiles.push(file);
    }
    
    // Check total size
    const totalSize = [...selectedFiles, ...validFiles].reduce((sum, file) => sum + file.size, 0);
    if (totalSize > CONFIG.MAX_SESSION_SIZE) {
        showError('Total file size exceeds 200MB limit');
        return;
    }
    
    selectedFiles.push(...validFiles);
    updateFileList();
}

function isValidFileType(mimeType) {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'text/plain', 'application/pdf', 'application/zip',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/json', 'application/xml',
        'text/csv', 'text/markdown'
    ];
    
    if (!mimeType) return false;
    
    // Check exact matches
    if (allowedTypes.includes(mimeType)) {
        return true;
    }
    
    // Check general image types
    if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
        return true;
    }
    
    return false;
}

function isValidFilename(filename) {
    // Check length
    if (filename.length > 255 || filename.length === 0) {
        return false;
    }
    
    // Check for dangerous patterns
    const dangerousPatterns = [
        /\.\.[\/\\]/, // Directory traversal
        /^[\/\\]/, // Absolute paths
        /[<>:"|?*]/, // Invalid characters
        /\.(exe|bat|cmd|com|scr|pif|vbs|js|jar|sh)$/i, // Executable extensions
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i // Reserved names
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(filename));
}

function updateFileList() {
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const fileItem = createFileItem(file, index);
        fileList.appendChild(fileItem);
    });
    
    // Update transfer button visibility
    const startBtn = document.getElementById('start-transfer-btn');
    if (selectedFiles.length > 0 && currentSession) {
        startBtn.style.display = 'block';
    } else {
        startBtn.style.display = 'none';
    }
}

function createFileItem(file, index) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = getFileIcon(file.type);
    const size = formatFileSize(file.size);
    
    div.innerHTML = `
        <div class="file-info">
            <span class="file-icon">${icon}</span>
            <div class="file-details">
                <h4>${file.name}</h4>
                <small>${size}</small>
            </div>
        </div>
        <div class="file-actions">
            <button onclick="removeFile(${index})" title="Remove">❌</button>
        </div>
    `;
    
    return div;
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType === 'application/zip') return '📦';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Transfer Management
async function startTransfer() {
    if (selectedFiles.length === 0) {
        showError('Please select files to transfer');
        return;
    }
    
    isTransferring = true;
    transferStats.startTime = Date.now();
    transferStats.totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    transferStats.bytesTransferred = 0;
    
    document.getElementById('transfer-progress').style.display = 'block';
    document.getElementById('start-transfer-btn').style.display = 'none';
    
    // Check if we have P2P connection
    if (dataChannel && dataChannel.readyState === 'open' && fileTransferManager) {
        // Use P2P transfer
        updateTransferMode('Direct P2P');
        try {
            await fileTransferManager.sendFiles(selectedFiles);
        } catch (error) {
            console.error('P2P transfer failed:', error);
            handleP2PFailure();
        }
    } else {
        // Try P2P first, then fallback
        await startP2PConnection();
        
        // If P2P doesn't connect in time, fallback will be triggered
        setTimeout(() => {
            if (!dataChannel || dataChannel.readyState !== 'open') {
                console.log('P2P connection timeout, falling back to server');
                handleP2PFailure();
            } else if (fileTransferManager) {
                // Start P2P transfer
                updateTransferMode('Direct P2P');
                fileTransferManager.sendFiles(selectedFiles).catch(error => {
                    console.error('P2P transfer failed:', error);
                    handleP2PFailure();
                });
            }
        }, CONFIG.P2P_TIMEOUT);
    }
}

function cancelSession() {
    if (websocket) {
        websocket.close();
        websocket = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    currentSession = null;
    currentRole = null;
    selectedFiles = [];
    isTransferring = false;
    
    showScreen('home');
}

// UI Updates
function updateStatus(text, icon) {
    document.getElementById('status-text').textContent = text;
    document.getElementById('status-icon').textContent = icon;
}

function updateReceiverStatus(text, icon) {
    document.getElementById('receiver-status-text').textContent = text;
    document.getElementById('receiver-status-icon').textContent = icon;
    document.getElementById('receiver-status').style.display = 'block';
}

function updateConnectionStatus(text, icon) {
    const progressContainer = document.getElementById('connection-progress');
    const progressText = document.getElementById('connection-progress-text');
    
    progressContainer.style.display = 'block';
    progressText.textContent = text;
}

function copySessionCode() {
    if (currentSession) {
        navigator.clipboard.writeText(currentSession.code).then(() => {
            // Visual feedback
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });
    }
}

async function showQRCode() {
    if (currentSession) {
        const qrContainer = document.getElementById('qr-code-container');
        
        try {
            // Generate QR code with session URL
            const sessionUrl = `${window.location.origin}?join=${currentSession.code}`;
            const qrCodeDataUrl = await QRCode.toDataURL(sessionUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#333333',
                    light: '#ffffff'
                }
            });
            
            qrContainer.innerHTML = `
                <div style="text-align: center;">
                    <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px; border-radius: 10px;" />
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                        Scan to join session: <strong>${currentSession.code}</strong>
                    </p>
                </div>
            `;
        } catch (error) {
            console.error('QR code generation error:', error);
            qrContainer.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
                    <p>Session Code: <strong style="font-size: 1.2rem;">${currentSession.code}</strong></p>
                    <small style="color: #666;">QR code generation failed</small>
                </div>
            `;
        }
        
        qrModal.style.display = 'flex';
    }
}

function handleCodeInput(event) {
    const input = event.target;
    input.value = input.value.toUpperCase().replace(/[^A-F0-9]/g, '').substring(0, 6);
}

// Transfer Progress Handlers
function handleTransferProgress(progressInfo) {
    switch (progressInfo.type) {
        case 'progress':
            updateTransferProgress(
                progressInfo.percentage,
                progressInfo.transferredBytes,
                progressInfo.totalBytes,
                progressInfo.speed
            );
            break;
            
        case 'file-metadata':
            if (currentRole === 'receiver') {
                addIncomingFile(progressInfo);
            }
            break;
            
        case 'file-complete':
            if (currentRole === 'receiver') {
                addCompletedFile({
                    filename: progressInfo.filename,
                    downloadUrl: progressInfo.downloadUrl,
                    blob: progressInfo.blob
                });
            }
            break;
    }
}

function handleTransferComplete(isSender) {
    isTransferring = false;
    
    if (isSender) {
        updateStatus('Transfer completed successfully!', '🎉');
    } else {
        updateReceiverStatus('All files received successfully!', '🎉');
        document.getElementById('completed-files').style.display = 'block';
    }
}

function handleTransferError(error) {
    console.error('Transfer error:', error);
    showError(`Transfer failed: ${error.message}`);
    isTransferring = false;
    
    if (currentRole === 'sender') {
        document.getElementById('start-transfer-btn').style.display = 'block';
    }
}

// UI Update Functions
function updateTransferMode(mode) {
    const modeElement = document.getElementById('transfer-mode');
    if (modeElement) {
        modeElement.textContent = `Mode: ${mode}`;
    }
}

function updateReceiveMode(mode) {
    const modeElement = document.getElementById('receive-mode');
    if (modeElement) {
        modeElement.textContent = `Mode: ${mode}`;
    }
}

function updateTransferProgress(percentage, transferred, total, speed = 0) {
    // Update progress bar
    const progressFill = document.getElementById('transfer-progress-fill');
    const progressText = document.getElementById('transfer-progress-text');
    const speedElement = document.getElementById('transfer-speed');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}% (${formatFileSize(transferred)} / ${formatFileSize(total)})`;
    }
    
    if (speedElement && speed > 0) {
        speedElement.textContent = `Speed: ${formatFileSize(speed)}/s`;
    }
}

function updateReceiveProgress(percentage, transferred, total) {
    const progressFill = document.getElementById('receive-progress-fill');
    const progressText = document.getElementById('receive-progress-text');
    
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${Math.round(percentage)}% (${formatFileSize(transferred)} / ${formatFileSize(total)})`;
    }
    
    document.getElementById('receive-progress').style.display = 'block';
}

function showIncomingFiles(files) {
    const incomingList = document.getElementById('incoming-file-list');
    incomingList.innerHTML = '';
    
    files.forEach(file => {
        const fileItem = createIncomingFileItem(file);
        incomingList.appendChild(fileItem);
    });
    
    document.getElementById('incoming-files').style.display = 'block';
}

function addIncomingFile(fileInfo) {
    const incomingList = document.getElementById('incoming-file-list');
    const fileItem = createIncomingFileItem(fileInfo);
    incomingList.appendChild(fileItem);
    document.getElementById('incoming-files').style.display = 'block';
}

function createIncomingFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = getFileIcon(file.mimeType || file.mimetype);
    const size = formatFileSize(file.size);
    
    div.innerHTML = `
        <div class="file-info">
            <span class="file-icon">${icon}</span>
            <div class="file-details">
                <h4>${file.filename}</h4>
                <small>${size}</small>
            </div>
        </div>
        <div class="file-status">
            <span>⏳ Receiving...</span>
        </div>
    `;
    
    return div;
}

function addCompletedFile(fileInfo) {
    const completedList = document.getElementById('completed-file-list');
    const fileItem = createCompletedFileItem(fileInfo);
    completedList.appendChild(fileItem);
    document.getElementById('completed-files').style.display = 'block';
}

function createCompletedFileItem(file) {
    const div = document.createElement('div');
    div.className = 'file-item';
    
    const icon = getFileIcon(file.blob ? file.blob.type : '');
    const size = formatFileSize(file.size || file.blob?.size || 0);
    
    div.innerHTML = `
        <div class="file-info">
            <span class="file-icon">${icon}</span>
            <div class="file-details">
                <h4>${file.filename}</h4>
                <small>${size}</small>
            </div>
        </div>
        <div class="file-actions">
            <a href="${file.downloadUrl}" download="${file.filename}" class="download-btn">📥 Download</a>
        </div>
    `;
    
    return div;
}

// Session cleanup on window unload
window.addEventListener('beforeunload', () => {
    if (websocket) {
        websocket.close();
    }
    
    if (peerConnection) {
        peerConnection.close();
    }
    
    // Clean up object URLs to prevent memory leaks
    document.querySelectorAll('a[download]').forEach(link => {
        if (link.href.startsWith('blob:')) {
            URL.revokeObjectURL(link.href);
        }
    });
});

// Export for global access
window.removeFile = removeFile;

// Server Fallback Implementation
async function startServerUpload() {
    updateStatus('Uploading to server for reliable delivery...', '☁️');
    updateTransferMode('Server Upload');
    
    try {
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentage = (event.loaded / event.total) * 100;
                updateTransferProgress(percentage, event.loaded, event.total);
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                updateStatus('Files uploaded successfully! Receiver can now download.', '✅');
                handleTransferComplete(true);
            } else {
                throw new Error('Upload failed');
            }
        });
        
        xhr.addEventListener('error', () => {
            throw new Error('Upload failed');
        });
        
        xhr.open('POST', `${CONFIG.API_URL}/session/${currentSession.code}/upload`);
        xhr.send(formData);
        
    } catch (error) {
        console.error('Server upload failed:', error);
        updateStatus('Upload failed. Please try again.', '❌');
        isTransferring = false;
        document.getElementById('start-transfer-btn').style.display = 'block';
    }
}

async function startServerDownload() {
    updateReceiverStatus('Checking for files on server...', '☁️');
    updateReceiveMode('Server Download');
    
    try {
        // Poll for files
        const pollForFiles = async () => {
            try {
                const response = await secureApiCall(`${CONFIG.API_URL}/session/${currentSession.code}/files`);
                const data = await response.json();
                
                if (data.files && data.files.length > 0) {
                    // Files are available
                    updateReceiverStatus('Files found! Starting download...', '📥');
                    showIncomingFiles(data.files);
                    
                    // Download files
                    for (const file of data.files) {
                        await downloadFileFromServer(file);
                    }
                    
                    handleTransferComplete(false);
                    return;
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
            
            // Continue polling
            setTimeout(pollForFiles, 2000);
        };
        
        pollForFiles();
        
    } catch (error) {
        console.error('Server download failed:', error);
        updateReceiverStatus('Download failed. Please try again.', '❌');
    }
}

async function downloadFileFromServer(fileInfo) {
    try {
        const response = await secureApiCall(`${CONFIG.API_URL}/session/${currentSession.code}/download/${fileInfo.id}`);
        
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        // Add to completed files list
        addCompletedFile({
            filename: fileInfo.filename,
            size: fileInfo.size,
            downloadUrl: downloadUrl,
            blob: blob
        });
        
    } catch (error) {
        console.error('File download failed:', error);
        showError(`Failed to download ${fileInfo.filename}: ${error.message}`);
    }
}

