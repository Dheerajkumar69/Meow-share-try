import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './Receiver.css';

const API_BASE = API_BASE_URL;

function Receiver() {
  const [code, setCode] = useState('');
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch session and files
  const fetchSession = async () => {
    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get session info
      const sessionResponse = await axios.get(`${API_BASE}/api/sessions/${code.trim()}`);
      setSession(sessionResponse.data);

      // Get files list
      const filesResponse = await axios.get(`${API_BASE}/api/sessions/${code.trim()}/files`);
      setFiles(filesResponse.data.files);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch session');
      setSession(null);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Download a single file
  const downloadFile = async (filename, originalName) => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/sessions/${code}/files/${filename}`,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file: ' + (err.response?.data?.message || err.message));
    }
  };

  // Download all files
  const downloadAll = async () => {
    for (const file of files) {
      await downloadFile(file.filename, file.originalName);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Reset
  const reset = () => {
    setCode('');
    setSession(null);
    setFiles([]);
    setError(null);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format date
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  // Get thumbnail URL
  const getThumbnailUrl = (filename) => {
    return `${API_BASE}/api/sessions/${code}/thumbnails/${filename}`;
  };

  return (
    <div className="receiver">
      {!session ? (
        <div className="input-section">
          <div className="icon-large">📥</div>
          <h2>Receive Photos</h2>
          <p>Enter the share code to view and download photos</p>

          <div className="code-input-group">
            <input
              type="text"
              className="code-input"
              placeholder="Enter 6-character code"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              onKeyPress={(e) => e.key === 'Enter' && fetchSession()}
              maxLength={6}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={fetchSession}
              disabled={loading || !code.trim()}
            >
              {loading ? 'Loading...' : 'Fetch Files'}
            </button>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="files-section">
          {/* Session Info */}
          <div className="session-info">
            <h2>📦 Session: {session.code}</h2>
            <div className="session-details">
              <p>
                <strong>Files:</strong> {files.length}
              </p>
              <p>
                <strong>Total Size:</strong> {formatFileSize(session.totalSize)}
              </p>
              <p>
                <strong>Expires:</strong> {formatDate(session.expiresAt)}
              </p>
            </div>
          </div>

          {/* Files Grid */}
          {files.length > 0 ? (
            <>
              <div className="files-actions">
                <button className="btn btn-primary" onClick={downloadAll}>
                  Download All ({files.length})
                </button>
                <button className="btn btn-secondary" onClick={reset}>
                  Enter Different Code
                </button>
              </div>

              <div className="files-grid">
                {files.map((file, index) => (
                  <div key={index} className="file-card">
                    {file.hasThumbnail ? (
                      <div className="thumbnail-container">
                        <img
                          src={getThumbnailUrl(file.filename)}
                          alt={file.originalName}
                          className="thumbnail"
                          onClick={() => downloadFile(file.filename, file.originalName)}
                        />
                      </div>
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span>🖼️</span>
                      </div>
                    )}
                    <div className="file-info">
                      <p className="file-name" title={file.originalName}>
                        {file.originalName}
                      </p>
                      <p className="file-size">{formatFileSize(file.size)}</p>
                      <button
                        className="btn btn-sm btn-download"
                        onClick={() => downloadFile(file.filename, file.originalName)}
                      >
                        ⬇ Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No files in this session yet</p>
              <button className="btn btn-secondary" onClick={reset}>
                Try Another Code
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Receiver;
