// Validate session code format (6 character hex)
export const validateSessionCode = (req, res, next) => {
  const { code } = req.params;
  
  if (!code) {
    return res.status(400).json({ error: 'Session code is required' });
  }
  
  // Validate hex code format (6 characters)
  const hexPattern = /^[0-9a-f]{6}$/i;
  if (!hexPattern.test(code)) {
    return res.status(400).json({ error: 'Invalid session code format' });
  }
  
  // Convert to lowercase for consistency
  req.params.code = code.toLowerCase();
  next();
};

// Validate file upload
export const validateFileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }
  
  // Check total size
  const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = 200 * 1024 * 1024; // 200 MB
  
  if (totalSize > maxTotalSize) {
    return res.status(413).json({ 
      error: 'Total file size exceeds limit',
      message: 'Maximum total size is 200 MB'
    });
  }
  
  next();
};
