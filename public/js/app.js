// Get DOM elements first
const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById('uploadForm');

// File management
let selectedFilesArray = [];
let currentDownloadUrl = '';
let currentFileName = '';

// Form submission
uploadForm.addEventListener('submit', async (e) => {
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
  const progressContainer = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  const fileCount = selectedFilesArray.length > 0 ? selectedFilesArray.length : fileInput.files.length;
  
  progressText.textContent = `Processing ${fileCount} file${fileCount > 1 ? 's' : ''}... Please wait.`;
  progressContainer.style.display = 'block';
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
  
  currentDownloadUrl = data.downloadUrl;
  currentFileName = data.fileName;
  
  originalFileName.textContent = data.originalName;
  pdfFileName.textContent = data.fileName;
  fileCount.textContent = data.fileCount || 1;
  downloadLink.href = data.downloadUrl;
  downloadLink.download = data.fileName;
  
  resultContainer.style.display = 'block';
  document.getElementById('shareOptions').style.display = 'none';
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideResult() {
  document.getElementById('resultContainer').style.display = 'none';
}

function resetForm() {
  uploadForm.reset();
  hideResult();
  hideError();
  document.getElementById('fileList').style.display = 'none';
  document.getElementById('fileListItems').innerHTML = '';
  document.getElementById('orderWarning').style.display = 'none';
  selectedFilesArray = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// File input change
fileInput.addEventListener('change', (e) => {
  const files = e.target.files;
  const fileList = document.getElementById('fileList');
  
  if (files.length > 0) {
    selectedFilesArray = Array.from(files);
    renderFileList();
    fileList.style.display = 'block';
    
    if (files.length > 1) {
      document.getElementById('orderWarning').style.display = 'block';
    } else {
      document.getElementById('orderWarning').style.display = 'none';
    }
    
    console.log(`Selected ${files.length} file(s)`);
  } else {
    fileList.style.display = 'none';
    document.getElementById('orderWarning').style.display = 'none';
    selectedFilesArray = [];
  }
});

function renderFileList() {
  const fileListItems = document.getElementById('fileListItems');
  fileListItems.innerHTML = '';
  
  selectedFilesArray.forEach((file, index) => {
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
    
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDropItem);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('dragend', handleDragEnd);
    
    fileListItems.appendChild(li);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Drag and drop reordering
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
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

function handleDropItem(e) {
  if (e.stopPropagation) e.stopPropagation();
  this.classList.remove('drag-over');
  
  if (draggedElement !== this) {
    const draggedIndex = parseInt(draggedElement.dataset.index);
    const targetIndex = parseInt(this.dataset.index);
    const draggedFile = selectedFilesArray[draggedIndex];
    selectedFilesArray.splice(draggedIndex, 1);
    selectedFilesArray.splice(targetIndex, 0, draggedFile);
    renderFileList();
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function reverseFileOrder() {
  selectedFilesArray.reverse();
  renderFileList();
  showToast('File order reversed!', 'success');
}

function viewPDF() {
  window.open(getFullUrl(), '_blank');
  showToast('Opening PDF...', 'info');
}

// Drag and drop file upload
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadForm.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});

uploadForm.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, false);

// Share functions
function toggleShareOptions() {
  const shareOptions = document.getElementById('shareOptions');
  shareOptions.style.display = shareOptions.style.display === 'none' ? 'block' : 'none';
}

function getFullUrl() {
  return window.location.origin + currentDownloadUrl;
}

function shareViaWhatsApp() {
  const url = getFullUrl();
  const text = `Check out this PDF: ${currentFileName}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
}

function shareViaMessenger() {
  window.location.href = `fb-messenger://share?link=${encodeURIComponent(getFullUrl())}`;
  showToast('Opening Messenger...', 'info');
}

function shareViaGmail() {
  const url = getFullUrl();
  const subject = encodeURIComponent('PDF Document');
  const body = encodeURIComponent(`Hi,\n\nCheck out this PDF:\n${currentFileName}\n${url}`);
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
}

function shareViaTelegram() {
  const url = getFullUrl();
  const text = `Check out this PDF: ${currentFileName}`;
  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
}

function shareViaEmail() {
  const url = getFullUrl();
  const subject = encodeURIComponent('PDF Document');
  const body = encodeURIComponent(`Hi,\n\nCheck out this PDF:\n${currentFileName}\n${url}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shareViaTwitter() {
  const url = getFullUrl();
  const text = `Check out this PDF: ${currentFileName}`;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

function shareViaLinkedIn() {
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getFullUrl())}`, '_blank');
}

async function copyShareLink() {
  const url = getFullUrl();
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied!', 'success');
  } catch (err) {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Link copied!', 'success');
    } catch (err) {
      showToast('Failed to copy', 'error');
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
  setTimeout(() => toastContainer.remove(), 4000);
}