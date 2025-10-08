import { useState } from 'react';
import axios from 'axios';
import './Receiver.css';

const API_BASE = '/api';

function Receiver() {
  const [code, setCode] = useState('');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState({});

  // Fetch session info
  const fetchSession = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }

    setLoading(true);
    setError('');
    setSession(null);

    try {
      const response = await axios.get(`${API_BASE}/session/${code.toLowerCase()}`);
      setSession(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Session not found');
    } finally {
      setLoading(false);
    }
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
          ) : (
            <p className="no-files">No files in this session yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Receiver;
