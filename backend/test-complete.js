/**
 * Complete test script for Meow Share API
 * Tests: Session creation, file upload, file listing, download, thumbnails
 * 
 * Run: node test-complete.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3000';

// Helper to create form data for file upload
async function uploadFiles(code, filePaths) {
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  
  for (const filePath of filePaths) {
    const fileStream = fs.createReadStream(filePath);
    const filename = path.basename(filePath);
    formData.append('files', fileStream, filename);
  }
  
  const response = await fetch(`${API_BASE}/api/sessions/${code}/upload`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });
  
  return response;
}

// Test 1: Create Session
async function testCreateSession() {
  console.log('\n📝 Test 1: Create Session');
  try {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Session created:', data);
    console.log(`  Code: ${data.code}`);
    console.log(`  Expires: ${data.expiresAt}`);
    return data.code;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return null;
  }
}

// Test 2: Get Session Info
async function testGetSession(code) {
  console.log(`\n📝 Test 2: Get Session Info (${code})`);
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${code}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Session info retrieved');
    console.log(`  Code: ${data.code}`);
    console.log(`  Files: ${data.files.length}`);
    console.log(`  Total size: ${(data.totalSize / 1024).toFixed(2)} KB`);
    return data;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return null;
  }
}

// Test 3: Upload Files (requires test images)
async function testUploadFiles(code) {
  console.log(`\n📝 Test 3: Upload Files to Session (${code})`);
  console.log('Note: This test requires test images. Skipping if not available.');
  
  // Check if test images exist
  const testImagesDir = path.join(__dirname, 'test-images');
  if (!fs.existsSync(testImagesDir)) {
    console.log('⚠ No test-images directory found. Skipping upload test.');
    console.log(`  Create directory: ${testImagesDir}`);
    console.log('  Add some .jpg, .png, or .webp files to test uploads.');
    return false;
  }
  
  const files = fs.readdirSync(testImagesDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join(testImagesDir, f));
  
  if (files.length === 0) {
    console.log('⚠ No image files found in test-images directory.');
    return false;
  }
  
  try {
    console.log(`  Uploading ${files.length} file(s)...`);
    const response = await uploadFiles(code, files);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Files uploaded successfully');
    console.log(`  Files uploaded: ${data.filesCount}`);
    console.log(`  Total size: ${(data.totalSize / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return false;
  }
}

// Test 4: List Files
async function testListFiles(code) {
  console.log(`\n📝 Test 4: List Files in Session (${code})`);
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${code}/files`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Files list retrieved');
    console.log(`  Total files: ${data.filesCount}`);
    console.log(`  Total size: ${(data.totalSize / 1024).toFixed(2)} KB`);
    
    if (data.files.length > 0) {
      console.log('  Files:');
      data.files.forEach((file, i) => {
        console.log(`    ${i + 1}. ${file.originalName} (${(file.size / 1024).toFixed(2)} KB)`);
        console.log(`       Filename: ${file.filename}`);
        console.log(`       Thumbnail: ${file.hasThumbnail ? 'Yes' : 'No'}`);
      });
    }
    
    return data.files;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return [];
  }
}

// Test 5: Download File
async function testDownloadFile(code, filename) {
  console.log(`\n📝 Test 5: Download File (${filename})`);
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${code}/files/${filename}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    console.log('✓ File downloaded successfully');
    console.log(`  Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    return true;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return false;
  }
}

// Test 6: Get Thumbnail
async function testGetThumbnail(code, filename) {
  console.log(`\n📝 Test 6: Get Thumbnail (${filename})`);
  try {
    const response = await fetch(`${API_BASE}/api/sessions/${code}/thumbnails/${filename}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }
    
    const buffer = await response.arrayBuffer();
    console.log('✓ Thumbnail retrieved successfully');
    console.log(`  Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.error('✗ Error:', error.message);
    return false;
  }
}

// Test 7: Invalid Session
async function testInvalidSession() {
  console.log('\n📝 Test 7: Invalid Session Code');
  try {
    const response = await fetch(`${API_BASE}/api/sessions/invalid99`);
    const data = await response.json();
    
    if (response.status === 404) {
      console.log('✓ Correctly returns 404 for invalid session');
      console.log(`  Message: ${data.message}`);
      return true;
    } else {
      console.log('✗ Expected 404 status code');
      return false;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🐱 Meow Share - Complete API Tests');
  console.log('=====================================');
  console.log('Make sure the server is running on port 3000!');
  
  // Test session creation
  const code = await testCreateSession();
  if (!code) {
    console.log('\n❌ Session creation failed. Cannot continue tests.');
    return;
  }
  
  // Test getting session info
  await testGetSession(code);
  
  // Test file upload (optional - requires test images)
  const uploadSuccess = await testUploadFiles(code);
  
  // Test listing files
  const files = await testListFiles(code);
  
  // Test download and thumbnail (if files were uploaded)
  if (uploadSuccess && files.length > 0) {
    const firstFile = files[0];
    await testDownloadFile(code, firstFile.filename);
    
    if (firstFile.hasThumbnail) {
      await testGetThumbnail(code, firstFile.filename);
    }
  }
  
  // Test invalid session
  await testInvalidSession();
  
  console.log('\n=====================================');
  console.log('✓ All tests complete!');
  console.log('\n📋 Summary:');
  console.log(`  Session Code: ${code}`);
  console.log(`  Files: ${files.length}`);
  console.log(`  View session: GET ${API_BASE}/api/sessions/${code}`);
  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
