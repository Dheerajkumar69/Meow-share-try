import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import P2PFileTransfer from '../services/p2pFileTransfer.js';
import './Receiver.css';

const API_BASE = '/api';

function ReceiverP2P() {
  const [code, setCode] = useState('');
  const [session, setSession] = useState(null);
  const [transferMode, setTransferMode] = useState('waiting'); // waiting, p2p-connected, server-downloading, complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({});
  const [downloading, setDownloading] = useState({});
  
  const p2pTransfer = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (p2pTransfer.current) {
        p2pTransfer.current.cleanup();
      }
    };
  }, []);

  // Fetch session info
  const fetchSession = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }

    setLoading(true);
    setError('');
    setSession(null);
    setTransferMode('waiting');

    try {
      const response = await axios.get(`${API_BASE}/session/${code.toLowerCase()}`);
      setSession(response.data);
      
      // If there are files on server, show them
      if (response.data.files && response.data.files.length > 0) {
        setTransferMode('server-downloading');
      } else {
        // Try P2P connection
        await startP2PConnection();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Session not found');
    } finally {
      setLoading(false);
    }
  };

  // Start P2P connection
  const startP2PConnection = async () => {
    try {
      setTransferMode('p2p-connecting');
      
      // Initialize P2P transfer
      p2pTransfer.current = new P2PFileTransfer();
      
      await p2pTransfer.current.initialize(code.toLowerCase(), 'receiver', {
        onStateChange: handleP2PStateChange,
        onProgress: handleProgress,
        onFileComplete: handleFileComplete,
        onError: handleP2PError
      });

    } catch (err) {
      console.error('P2P connection failed:', err);
      setError('Failed to connect: ' + err.message);
      setTransferMode('waiting');
    }
  };

  // Handle P2P state changes
  const handleP2PStateChange = (type, data) => {
    console.log('P2P State Change:', type, data);
    
    switch (type) {
      case 'p2p-ready':
        setTransferMode('p2p-connected');
        setError('');
        break;
      case 'error':
        setError('P2P Error: ' + data);
        setTransferMode('waiting');
        break;
    }
  };

  // Handle progress updates
  const handleProgress = (fileId, progressData) => {
    setProgress(prev => ({
      ...prev,
      [fileId]: progressData
    }));
  };

  // Handle file completion
  const handleFileComplete = (fileId, file) => {
    console.log('File received:', fileId, file.name);
    setTransferMode('complete');
    // You can add success message handling here if needed
  };

  // Handle P2P errors
  const handleP2PError = (error) => {
    console.error('P2P Error:', error);
    setError('P2P Error: ' + error.message);
  };

  // Download a single file
  const downloadFile = async (fileId, fileName) => {
    setDownloading(prev => ({ ...prev, [fileId]: true }));
    
    try {
      const response = await axios.get(
        `${API_BASE}/session/${code.toLowerCase()}/download/${fileId}`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to download ${fileName}`);
    } finally {
      setDownloading(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // Download all files
  const downloadAll = async () => {
    if (!session || !session.files) return;
    
    for (const file of session.files) {
      await downloadFile(file.id, file.name);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Format bytes to readable size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format expiry date
  const formatExpiry = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Render transfer status
  const renderTransferStatus = () => {
    switch (transferMode) {
      case 'p2p-connecting':
        return (
          <div className="transfer-status p2p-connecting">
            <div className="status-icon">🔄</div>
            <h3>Connecting Directly</h3>
            <p>Attempting direct connection to sender...</p>
          </div>
        );
      
      case 'p2p-connected':
        return (
          <div className="transfer-status p2p-connected">
            <div className="status-icon">⚡</div>
            <h3>Direct Connection Active</h3>
            <p>Connected! Waiting for files to be sent...</p>
          </div>
        );
      
      case 'server-downloading':
        return (
          <div className="transfer-status server-downloading">
            <div className="status-icon">☁️</div>
            <h3>Files Available on Server</h3>
            <p>Files are ready for download from our servers</p>
          </div>
        );
      
      case 'complete':
        return (
          <div className="transfer-status complete">
            <div className="status-icon">✅</div>
            <h3>Transfer Complete</h3>
            <p>All files have been received!</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="receiver">
      <div className="code-input-section">
        <h2>Enter Sharing Code</h2>
        <p>Enter the 6-character code you received</p>
        
        <div className="code-input-group">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            disabled={loading}
          />
          <button 
            onClick={fetchSession} 
            disabled={loading || code.length !== 6}
            className="btn-primary"
          >
            {loading ? 'Loading...' : 'Get Files'}
          </button>
        </div>
      </div>

      {error && <div className="message error">{error}</div>}

      {session && (
        <div className="session-info">
          <div className="session-header">
            <h3>Available Files</h3>
            <p className="expiry">Expires: {formatExpiry(session.expiresAt)}</p>
          </div>

          <div className="session-stats">
            <span>{session.fileCount} file(s)</span>
            <span>Total: {formatBytes(session.totalSize)}</span>
          </div>

          {renderTransferStatus()}

          {session.files && session.files.length > 0 ? (
            <>
              <div className="file-grid">
                {session.files.map((file) => (
                  <div key={file.id} className="file-card">
                    <div className="file-icon">📷</div>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatBytes(file.size)}</div>
                    </div>
                    <button
                      onClick={() => downloadFile(file.id, file.name)}
                      disabled={downloading[file.id]}
                      className="btn-download"
                    >
                      {downloading[file.id] ? '⏳' : '⬇️'}
                    </button>
                  </div>
                ))}
              </div>

              {session.files.length > 1 && (
                <button onClick={downloadAll} className="btn-primary btn-download-all">
                  Download All Files
                </button>
              )}
            </>
          ) : transferMode === 'p2p-connected' ? (
            <p className="waiting-files">Waiting for files to be sent directly...</p>
          ) : (
            <p className="no-files">No files in this session yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceiverP2P;
