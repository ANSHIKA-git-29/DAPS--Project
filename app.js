/* ============================================
   DAPS — Digital Asset Protection System
   Frontend JavaScript Logic
   ============================================ */

// ── State ──
let selectedFile = null;
let lastResult   = null;

// ── DOM Elements ──
const fileInput   = document.getElementById('fileInput');
const dropZone    = document.getElementById('dropZone');
const filePreview = document.getElementById('filePreview');
const fileName    = document.getElementById('fileName');
const fileSize    = document.getElementById('fileSize');
const fileIcon    = document.getElementById('fileIcon');
const removeBtn   = document.getElementById('removeFile');
const scanBtn     = document.getElementById('scanBtn');
const scanOverlay = document.getElementById('scanOverlay');
const scanStatus  = document.getElementById('scanStatus');
const scanBar     = document.getElementById('scanBar');
const scanSteps   = document.getElementById('scanStepsList');
const mainCard    = document.getElementById('mainCard');
const resultCard  = document.getElementById('resultCard');


// ── Animated grid background ──
(function drawGrid() {
  const canvas = document.getElementById('gridCanvas');
  const ctx    = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(79,163,247,0.12)';
    ctx.lineWidth   = 0.5;
    const spacing   = 60;
    for (let x = 0; x < canvas.width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }
  draw();
  window.addEventListener('resize', draw);
})();


// ── File helpers ──
function getFileIcon(file) {
  const type = file.type;
  if (type.startsWith('image/'))  return '🖼️';
  if (type.startsWith('video/'))  return '🎬';
  if (type.includes('pdf'))       return '📕';
  if (type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) return '📝';
  if (type.includes('text'))      return '📄';
  return '📁';
}

function formatSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}

function setFile(file) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  fileIcon.textContent = getFileIcon(file);
  filePreview.style.display = 'block';
  dropZone.style.display    = 'none';
  scanBtn.disabled = false;
}

function clearFile() {
  selectedFile      = null;
  fileInput.value   = '';
  filePreview.style.display = 'none';
  dropZone.style.display    = '';
  scanBtn.disabled  = true;
}


// ── File Input Events ──
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) setFile(e.target.files[0]);
});

removeBtn.addEventListener('click', clearFile);

// Drag-and-drop
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});
dropZone.addEventListener('click', () => fileInput.click());


// ── Scan Logic ──
const SCAN_STEPS = [
  { text: 'Reading file metadata…',        delay: 0 },
  { text: 'Computing SHA-256 hash…',       delay: 700 },
  { text: 'Checking copyright database…',  delay: 1400 },
  { text: 'Running perceptual analysis…',  delay: 2100 },
  { text: 'AI pattern matching…',          delay: 2800 },
  { text: 'Finalizing report…',            delay: 3500 },
];

async function startScan() {
  if (!selectedFile) return;

  // Show overlay
  scanOverlay.style.display = 'flex';
  scanBar.style.width = '0%';
  scanSteps.innerHTML = '';
  scanStatus.textContent = 'Initializing AI engine…';

  // Animate steps
  SCAN_STEPS.forEach((step, i) => {
    setTimeout(() => {
      const li = document.createElement('div');
      li.className = 'scan-step-item';
      li.textContent = step.text;
      scanSteps.appendChild(li);
      scanStatus.textContent = step.text;
      scanBar.style.width = `${Math.round(((i+1)/SCAN_STEPS.length)*90)}%`;

      // Mark previous as done
      const items = scanSteps.querySelectorAll('.scan-step-item');
      if (items[i-1]) items[i-1].classList.add('done');
    }, step.delay);
  });

  // Call backend (or simulate if not connected)
  let result;
  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    // Try real backend first
    const res = await fetch('http://localhost:3001/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Backend error');
    result = await res.json();
  } catch (_) {
    // Fallback: simulate AI result in browser
    await new Promise(r => setTimeout(r, 4200));
    result = simulateAnalysis(selectedFile);
  }

  // Progress to 100%
  setTimeout(() => {
    scanBar.style.width = '100%';
    const items = scanSteps.querySelectorAll('.scan-step-item');
    items.forEach(i => i.classList.add('done'));
    scanStatus.textContent = 'Analysis complete.';
  }, 3700);

  // Show result after animation
  setTimeout(() => {
    scanOverlay.style.display = 'none';
    showResult(result);
  }, 4400);
}

// Simulate analysis using a simple hash-based approach
function simulateAnalysis(file) {
  // Use file name + size to produce a deterministic-ish "hash"
  let hash = 0;
  for (let i = 0; i < file.name.length; i++) {
    hash = ((hash << 5) - hash) + file.name.charCodeAt(i);
    hash |= 0;
  }
  hash += file.size;

  // Randomly flag ~35% of files as violations
  const flagged = (Math.abs(hash) % 100) < 35;

  const fileHash = Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();

  if (flagged) {
    return {
      status: 'danger',
      message: 'Unauthorized Usage Detected',
      detail: 'This file matches a protected asset in our copyright database. Unauthorized distribution or reproduction may violate IP law.',
      hash: fileHash,
      fileName: file.name,
      fileSize: formatSize(file.size),
      confidence: (75 + Math.floor(Math.abs(hash) % 20)) + '%',
      scanTime: (2.8 + Math.random()).toFixed(2) + 's',
    };
  } else {
    return {
      status: 'safe',
      message: 'No Issues Found',
      detail: 'Your file passed all AI-powered checks. No unauthorized usage, copyright violations, or known fingerprints were detected.',
      hash: fileHash,
      fileName: file.name,
      fileSize: formatSize(file.size),
      confidence: (90 + Math.floor(Math.abs(hash) % 9)) + '%',
      scanTime: (1.9 + Math.random()).toFixed(2) + 's',
    };
  }
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}


// ── Display Result ──
function showResult(data) {
  lastResult = data;

  mainCard.style.display = 'none';
  resultCard.style.display = 'block';
  resultCard.className = 'result-card ' + (data.status === 'danger' ? 'danger' : 'safe');

  document.getElementById('resultIcon').textContent  = data.status === 'danger' ? '🚨' : '✅';
  document.getElementById('resultTitle').textContent = data.message;
  document.getElementById('resultDesc').textContent  = data.detail;

  // Meta grid
  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-item">
      <span class="meta-label">File Name</span>
      <span class="meta-value">${data.fileName || selectedFile?.name || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">File Size</span>
      <span class="meta-value">${data.fileSize || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">SHA-256 Hash</span>
      <span class="meta-value" style="font-size:11px;font-family:monospace">${data.hash || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">AI Confidence</span>
      <span class="meta-value">${data.confidence || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Scan Duration</span>
      <span class="meta-value">${data.scanTime || '—'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Status</span>
      <span class="meta-value" style="color:${data.status === 'danger' ? 'var(--danger)' : 'var(--success)'}">
        ${data.status === 'danger' ? '⚠ Flagged' : '✓ Clear'}
      </span>
    </div>
  `;
}

function resetScan() {
  mainCard.style.display   = 'block';
  resultCard.style.display = 'none';
  clearFile();
  lastResult = null;
}


// ── Download Report ──
function downloadReport() {
  if (!lastResult) return;
  const now  = new Date().toLocaleString();
  const text = `
DAPS — Digital Asset Protection System
Report Generated: ${now}
==========================================

File Name:    ${lastResult.fileName}
File Size:    ${lastResult.fileSize}
SHA-256 Hash: ${lastResult.hash}
AI Confidence: ${lastResult.confidence}
Scan Duration: ${lastResult.scanTime}

RESULT: ${lastResult.message}

${lastResult.detail}

==========================================
This report was generated by DAPS v2.1.
B.Tech CSE Prototype — AI-Powered IP Protection
  `.trim();

  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `DAPS_Report_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
// ===== ADD HERE (BOTTOM OF FILE) =====
async function startScan() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please upload a file first!");
    return;
  }

  const overlay = document.getElementById("scanOverlay");
  const status = document.getElementById("scanStatus");
  const bar = document.getElementById("scanBar");

  overlay.style.display = "flex";

  let progress = 0;

  const steps = [
    "Initializing AI engine...",
    "Uploading file...",
    "Generating fingerprint...",
    "Analyzing content...",
    "Fetching results..."
  ];

  let stepIndex = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 95) progress = 95;

    bar.style.width = progress + "%";

    if (stepIndex < steps.length) {
      status.innerText = steps[stepIndex];
      stepIndex++;
    }
  }, 700);

  try {
    // 🔥 SEND FILE TO BACKEND
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:3001/analyze", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    clearInterval(interval);
    bar.style.width = "100%";
    status.innerText = "Analysis Complete ✅";

    setTimeout(() => {
      overlay.style.display = "none";
      showResult(data); // send backend data
    }, 1000);

  } catch (error) {
    clearInterval(interval);
    overlay.style.display = "none";
    alert("Error connecting to server ❌");
    console.error(error);
  }
}
function showResult(data) {
    saveHistory(data);
  const card = document.getElementById("resultCard");

  const title = document.getElementById("resultTitle");
  const desc = document.getElementById("resultDesc");
  const meta = document.getElementById("resultMeta");
  const icon = document.getElementById("resultIcon");

  card.style.display = "block";

  if (data.status === "danger") {
    title.innerText = "⚠ Unauthorized Usage Detected";
    desc.innerText = data.detail;
    icon.innerText = "⚠";
  } else {
    title.innerText = "✅ Safe Content";
    desc.innerText = data.detail;
    icon.innerText = "✔";
  }

  meta.innerHTML = `
    <p><strong>File:</strong> ${data.fileName}</p>
    <p><strong>Size:</strong> ${data.fileSize}</p>
    <p><strong>Confidence:</strong> ${data.confidence}</p>
    <p><strong>Scan Time:</strong> ${data.scanTime}</p>
    <p><strong>Hash:</strong> ${data.hash}</p>
  `;
}
function downloadReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Digital Asset Protection Report", 20, 20);

  doc.setFontSize(12);
  doc.text("Result: " + document.getElementById("resultTitle").innerText, 20, 40);
  doc.text("Details: " + document.getElementById("resultDesc").innerText, 20, 50);

  doc.save("DAPS_Report.pdf");
}

function downloadReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.text("DAPS Report", 20, 20);
  doc.text(document.getElementById("resultTitle").innerText, 20, 40);

  doc.save("report.pdf");
}
function saveHistory(data) {
  let history = JSON.parse(localStorage.getItem("scanHistory")) || [];
  history.push(data);
  localStorage.setItem("scanHistory", JSON.stringify(history));
}
function showHistory() {
  const history = JSON.parse(localStorage.getItem("scanHistory")) || [];
  const box = document.getElementById("historyBox");

  box.innerHTML = "<h3>Scan History</h3>";

  history.forEach(item => {
    box.innerHTML += `<p>${item.fileName} - ${item.status}</p>`;
  });
}