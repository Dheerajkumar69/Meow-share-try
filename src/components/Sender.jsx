import { useState } from 'react';
import axios from 'axios';
import './Sender.css';

const API_BASE = '/api';

function Sender() {
  const [sessionCode, setSessionCode] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create a new session
  const createSession = async () => {
    try {
      setError('');
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

  // Upload files
  const uploadFiles = async () => {
    if (!sessionCode) {
      setError('Please create a session first');
      return;
    }

    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

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

      setSuccess(`Successfully uploaded ${files.length} file(s)!`);
      setFiles([]);
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Calculate total size
  const getTotalSize = () => {
    const bytes = files.reduce((sum, file) => sum + file.size, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
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
              disabled={uploading}
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

            <button 
              onClick={uploadFiles} 
              disabled={uploading || files.length === 0}
              className="btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}
    </div>
  );
}

export default Sender;
