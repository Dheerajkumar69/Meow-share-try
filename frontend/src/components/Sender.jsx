import { useState, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './Sender.css';

const API_BASE = API_BASE_URL;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Sender() {
  const [sessionCode, setSessionCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Create a new session
  const createSession = async () => {
    try {
      setError(null);
      const response = await axios.post(`${API_BASE}/api/sessions`);
      setSessionCode(response.data.code);
      setExpiresAt(response.data.expiresAt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    validateAndAddFiles(files);
  };

  // Validate and add files
  const validateAndAddFiles = (files) => {
    setError(null);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid type (only JPEG, PNG, WebP allowed)`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Too large (max 20 MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    validateAndAddFiles(files);
  };

  // Remove a file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const uploadFiles = async () => {
    if (!sessionCode || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE}/api/sessions/${sessionCode}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      setUploadedFiles(prev => [...prev, ...response.data.files]);
      setSelectedFiles([]);
      setUploadProgress(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Copy code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    alert('Code copied to clipboard!');
  };

  // Reset and start over
  const startOver = () => {
    setSessionCode(null);
    setExpiresAt(null);
    setSelectedFiles([]);
    setUploadedFiles([]);
    setError(null);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format expiry time
  const formatExpiry = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="sender">
      {!sessionCode ? (
        <div className="start-section">
          <div className="icon-large">📤</div>
          <h2>Send Photos</h2>
          <p>Create a session to get started</p>
          <button className="btn btn-primary btn-large" onClick={createSession}>
            Create Session
          </button>
        </div>
      ) : (
        <div className="session-active">
          {/* Session Code Display */}
          <div className="code-display">
            <h2>Your Share Code</h2>
            <div className="code-box">
              <span className="code">{sessionCode}</span>
              <button className="btn btn-secondary" onClick={copyCode}>
                📋 Copy
              </button>
            </div>
            <p className="expiry-info">
              Expires: {formatExpiry(expiresAt)}
            </p>
          </div>

          {/* File Upload Area */}
          <div className="upload-section">
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-content">
                <span className="dropzone-icon">📁</span>
                <p className="dropzone-text">
                  Drag & drop photos here, or click to select
                </p>
                <p className="dropzone-hint">
                  JPEG, PNG, WebP • Max 20 MB per file
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <h3>Selected Files ({selectedFiles.length})</h3>
                <div className="files-list">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <button
                        className="btn-remove"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={uploadFiles}
                  disabled={uploading}
                >
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
                </button>
                {uploading && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="uploaded-files">
                <h3>✓ Uploaded Files ({uploadedFiles.length})</h3>
                <div className="files-list">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="file-item uploaded">
                      <span className="file-name">{file.originalName}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="upload-status">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-box">
              <strong>Error:</strong>
              <pre>{error}</pre>
            </div>
          )}

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-secondary" onClick={startOver}>
              Start New Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sender;
