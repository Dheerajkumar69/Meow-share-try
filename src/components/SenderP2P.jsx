import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import P2PFileTransfer from '../services/p2pFileTransfer.js';
import './Sender.css';

const API_BASE = '/api';

function SenderP2P() {
  const [sessionCode, setSessionCode] = useState('');
  const [files, setFiles] = useState([]);
  const [transferMode, setTransferMode] = useState('waiting'); // waiting, p2p-attempting, p2p-connected, p2p-timeout, server-uploading, complete
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState({});
  const [p2pCountdown, setP2pCountdown] = useState(0);
  
  const p2pTransfer = useRef(null);
  const countdownInterval = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (p2pTransfer.current) {
        p2pTransfer.current.cleanup();
      }
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Create a new session
  const createSession = async () => {
    try {
      setError('');
      setTransferMode('waiting');
      const response = await axios.post(`${API_BASE}/session/create`);
      setSessionCode(response.data.code);
      setSuccess('Session created! Now select files to upload.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create session');
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError('');
  };

  // Start P2P transfer
  const startP2PTransfer = async () => {
    if (!sessionCode || files.length === 0) {
      setError('Please create a session and select files first');
      return;
    }

    setTransferMode('p2p-attempting');
    setError('');
    setSuccess('');

    try {
      // Initialize P2P transfer
      p2pTransfer.current = new P2PFileTransfer();
      
      await p2pTransfer.current.initialize(sessionCode, 'sender', {
        onStateChange: handleP2PStateChange,
        onProgress: handleProgress,
        onFileComplete: handleFileComplete,
        onError: handleP2PError
      });

      // Start P2P countdown
      startP2PCountdown();

      // Send files
      await p2pTransfer.current.sendFiles(files);

    } catch (err) {
      console.error('P2P initialization failed:', err);
      setError('Failed to start P2P transfer: ' + err.message);
      setTransferMode('waiting');
    }
  };

  // Start P2P countdown
  const startP2PCountdown = () => {
    setP2pCountdown(6);
    countdownInterval.current = setInterval(() => {
      setP2pCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle P2P state changes
  const handleP2PStateChange = (type, data) => {
    console.log('P2P State Change:', type, data);
    
    switch (type) {
      case 'p2p-ready':
        setTransferMode('p2p-connected');
        setSuccess('Direct P2P connection established! Transferring files...');
        break;
      case 'p2p-timeout':
        setTransferMode('p2p-timeout');
        setError('Direct transfer failed - switching to server upload...');
        fallbackToServer();
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
    console.log('File completed:', fileId, file.name);
  };

  // Handle P2P errors
  const handleP2PError = (error) => {
    console.error('P2P Error:', error);
    setError('P2P Error: ' + error.message);
  };

  // Fallback to server upload
  const fallbackToServer = async () => {
    setTransferMode('server-uploading');
    setError('');
    setSuccess('Uploading to server for reliable delivery...');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      await axios.post(`${API_BASE}/session/${sessionCode}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`Successfully uploaded ${files.length} file(s) to server!`);
      setTransferMode('complete');
      setFiles([]);
      document.getElementById('file-input').value = '';
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload files to server');
      setTransferMode('waiting');
    }
  };

  // Calculate total size
  const getTotalSize = () => {
    const bytes = files.reduce((sum, file) => sum + file.size, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  // Get overall progress
  const getOverallProgress = () => {
    const progressValues = Object.values(progress);
    if (progressValues.length === 0) return 0;
    
    const totalProgress = progressValues.reduce((sum, p) => sum + p.percentage, 0);
    return Math.round(totalProgress / progressValues.length);
  };

  // Render transfer status
  const renderTransferStatus = () => {
    switch (transferMode) {
      case 'p2p-attempting':
        return (
          <div className="transfer-status p2p-attempting">
            <div className="status-icon">🔄</div>
            <h3>Attempting Direct Transfer</h3>
            <p>Looking for receiver... {p2pCountdown > 0 && `(${p2pCountdown}s)`}</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '30%' }}></div>
            </div>
          </div>
        );
      
      case 'p2p-connected':
        return (
          <div className="transfer-status p2p-connected">
            <div className="status-icon">⚡</div>
            <h3>Direct Transfer Active</h3>
            <p>Transferring files directly between devices...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${getOverallProgress()}%` }}></div>
            </div>
            <p className="progress-text">{getOverallProgress()}% complete</p>
          </div>
        );
      
      case 'p2p-timeout':
        return (
          <div className="transfer-status p2p-timeout">
            <div className="status-icon">⚠️</div>
            <h3>Direct Transfer Failed</h3>
            <p>Switching to server upload for reliable delivery...</p>
          </div>
        );
      
      case 'server-uploading':
        return (
          <div className="transfer-status server-uploading">
            <div className="status-icon">☁️</div>
            <h3>Uploading to Server</h3>
            <p>Files are being uploaded to our servers...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '70%' }}></div>
            </div>
          </div>
        );
      
      case 'complete':
        return (
          <div className="transfer-status complete">
            <div className="status-icon">✅</div>
            <h3>Transfer Complete</h3>
            <p>Files have been successfully shared!</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="sender">
      {!sessionCode ? (
        <div className="create-session">
          <h2>Start Sharing</h2>
          <p>Create a session to get your unique sharing code</p>
          <button onClick={createSession} className="btn-primary">
            Create Session
          </button>
        </div>
      ) : (
        <div className="upload-section">
          <div className="session-code-display">
            <h3>Your Sharing Code</h3>
            <div className="code-box">{sessionCode.toUpperCase()}</div>
            <p className="code-instruction">Share this code with others to let them download your photos</p>
          </div>

          <div className="file-upload">
            <h3>Upload Photos</h3>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={transferMode !== 'waiting' && transferMode !== 'complete'}
            />
            
            {files.length > 0 && (
              <div className="file-list">
                <p><strong>{files.length} file(s) selected</strong> ({getTotalSize()} MB)</p>
                <ul>
                  {files.slice(0, 5).map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                  {files.length > 5 && <li>... and {files.length - 5} more</li>}
                </ul>
              </div>
            )}

            {transferMode === 'waiting' && (
              <button 
                onClick={startP2PTransfer} 
                disabled={files.length === 0}
                className="btn-primary"
              >
                Start Transfer
              </button>
            )}

            {transferMode === 'p2p-timeout' && (
              <button 
                onClick={fallbackToServer} 
                className="btn-primary"
              >
                Upload to Server
              </button>
            )}
          </div>

          {renderTransferStatus()}
        </div>
      )}

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}
    </div>
  );
}

export default SenderP2P;
