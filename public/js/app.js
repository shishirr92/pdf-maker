document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Use reordered files array instead of file input
  const files = selectedFilesArray.length > 0 ? selectedFilesArray : Array.from(fileInput.files);
  
  if (!files || files.length === 0) {
    showError('Please select at least one file to convert.');
    return;
  }
  
  // Validate file sizes (50MB each)
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > 50 * 1024 * 1024) {
      showError(`File "${files[i].name}" exceeds 50MB limit.`);
      return;
    }
  }
  
  // Show progress
  showProgress();
  hideError();
  hideResult();
  
  // Create FormData with files in the correct order
  const formData = new FormData();
  console.log('Sending files in order:');
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`);
    formData.append('files', file);
  });
  
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      // Show success result
      showResult(data);
    } else {
      showError(data.error || 'Failed to convert files.');
    }
  } catch (error) {
    showError('Network error. Please try again.');
    console.error('Upload error:', error);
  } finally {
    hideProgress();
  }
});

function showProgress() {
  document.getElementById('progressContainer').style.display = 'block';
  document.getElementById('convertBtn').disabled = true;
}

function hideProgress() {
  document.getElementById('progressContainer').style.display = 'none';
  document.getElementById('convertBtn').disabled = false;
}

function showError(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  errorAlert.style.display = 'block';
  
  // Scroll to error
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('errorAlert').style.display = 'none';
}

function showResult(data) {
  const resultContainer = document.getElementById('resultContainer');
  const downloadLink = document.getElementById('downloadLink');
  const originalFileName = document.getElementById('originalFileName');
  const pdfFileName = document.getElementById('pdfFileName');
  const fileCount = document.getElementById('fileCount');
  
  // Store for sharing
  currentDownloadUrl = data.downloadUrl;
  currentFileName = data.fileName;
  
  originalFileName.textContent = data.originalName;
  pdfFileName.textContent = data.fileName;
  fileCount.textContent = data.fileCount || 1;
  downloadLink.href = data.downloadUrl;
  downloadLink.download = data.fileName;
  
  resultContainer.style.display = 'block';
  
  // Hide share options when showing new result
  document.getElementById('shareOptions').style.display = 'none';
  
  // Scroll to result
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
  document.getElementById('resultContainer').style.display = 'none';
}

function resetForm() {
  document.getElementById('uploadForm').reset();
  hideResult();
  hideError();
  document.getElementById('fileList').style.display = 'none';
  document.getElementById('fileListItems').innerHTML = '';
  document.getElementById('orderWarning').style.display = 'none';
  selectedFilesArray = []; // Clear reordered files
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Drag and drop support
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadForm.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  uploadForm.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadForm.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  uploadForm.classList.add('border-primary');
}

function unhighlight(e) {
  uploadForm.classList.remove('border-primary');
}

uploadForm.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  
  if (files.length > 0) {
    fileInput.files = files;
  }
}

// File input change event to show selected file names
let selectedFilesArray = [];

fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  const fileList = document.getElementById('fileList');
  const fileListItems = document.getElementById('fileListItems');
  
  if (files.length > 0) {
    // Store files in array
    selectedFilesArray = Array.from(files);
    renderFileList();
    
    fileList.style.display = 'block';
    
    // Show order warning for multiple files
    if (files.length > 1) {
      document.getElementById('orderWarning').style.display = 'block';
    } else {
      document.getElementById('orderWarning').style.display = 'none';
    }
    
    console.log(`Selected ${files.length} file(s) in order`);
  } else {
    fileList.style.display = 'none';
    document.getElementById('orderWarning').style.display = 'none';
    selectedFilesArray = [];
  }
});

function renderFileList() {
  const fileListItems = document.getElementById('fileListItems');
  fileListItems.innerHTML = '';
  
  console.log('Rendering file list:');
  selectedFilesArray.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`);
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.draggable = true;
    li.dataset.index = index;
    li.innerHTML = `
      <span>
        <i class="bi bi-grip-vertical text-muted me-2"></i>
        <span class="file-number">${index + 1}.</span>
        <i class="bi bi-file-earmark"></i> ${file.name}
      </span>
      <span class="badge bg-secondary">${formatFileSize(file.size)}</span>
    `;
    
    // Drag events
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('dragend', handleDragEnd);
    
    fileListItems.appendChild(li);
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  this.classList.remove('drag-over');
  
  if (draggedElement !== this) {
    const draggedIndex = parseInt(draggedElement.dataset.index);
    const targetIndex = parseInt(this.dataset.index);
    
    // Reorder array
    const draggedFile = selectedFilesArray[draggedIndex];
    selectedFilesArray.splice(draggedIndex, 1);
    selectedFilesArray.splice(targetIndex, 0, draggedFile);
    
    // Re-render list
    renderFileList();
  }
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Remove all drag-over classes
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
}

function reverseFileOrder() {
  selectedFilesArray.reverse();
  renderFileList();
  console.log('File order reversed');
  showToast('File order reversed! Check the numbers to confirm.', 'success');
}

function viewPDF() {
  const url = getFullUrl();
  // Open PDF in a new window/tab
  window.open(url, '_blank', 'width=1000,height=800,toolbar=yes,scrollbars=yes,resizable=yes');
  showToast('Opening PDF in new window...', 'info');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Share functionality
let currentDownloadUrl = '';
let currentFileName = '';

function toggleShareOptions() {
  const shareOptions = document.getElementById('shareOptions');
  if (shareOptions.style.display === 'none') {
    shareOptions.style.display = 'block';
  } else {
    shareOptions.style.display = 'none';
  }
}

function getFullUrl() {
  return window.location.origin + currentDownloadUrl;
}

function shareViaWhatsApp() {
  const url = getFullUrl();
  const text = `Check out this PDF I created: ${currentFileName}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
  window.open(whatsappUrl, '_blank');
}

function shareViaMessenger() {
  const url = getFullUrl();
  const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(url)}`;
  // Fallback to web version
  const webMessengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.href)}`;
  
  // Try mobile first, fallback to web
  window.location.href = messengerUrl;
  setTimeout(() => {
    showToast('Opening Messenger... If it doesn\'t open, use the copy link option.', 'info');
  }, 500);
}

function shareViaGmail() {
  const url = getFullUrl();
  const subject = encodeURIComponent('PDF Document');
  const body = encodeURIComponent(`Hi,\n\nI wanted to share this PDF document with you:\n\nFilename: ${currentFileName}\nDownload: ${url}\n\nBest regards`);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
  window.open(gmailUrl, '_blank');
}

function shareViaTelegram() {
  const url = getFullUrl();
  const text = `Check out this PDF: ${currentFileName}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, '_blank');
}

function shareViaEmail() {
  const url = getFullUrl();
  const subject = encodeURIComponent('PDF Document');
  const body = encodeURIComponent(`Hi,\n\nI wanted to share this PDF document with you:\n\nFilename: ${currentFileName}\nDownload: ${url}\n\nBest regards`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shareViaTwitter() {
  const url = getFullUrl();
  const text = `Check out this PDF document: ${currentFileName}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(twitterUrl, '_blank');
}

function shareViaLinkedIn() {
  const url = getFullUrl();
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  window.open(linkedInUrl, '_blank');
}

async function copyShareLink() {
  const url = getFullUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy link. Please copy manually: ' + url, 'error');
    }
    document.body.removeChild(textArea);
  }
}

function showToast(message, type = 'info') {
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-notification';
  
  const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';
  
  toastContainer.innerHTML = `
    <div class="alert ${bgClass} text-white alert-dismissible fade show" role="alert">
      <strong>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</strong> ${message}
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  document.body.appendChild(toastContainer);
  
  setTimeout(() => {
    toastContainer.remove();
  }, 4000);
}