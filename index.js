/* Advanced notes app script */

const newNoteBtn = document.getElementById("new-note-btn");
const notesList = document.getElementById("notes-list");
const searchInput = document.getElementById("search");
const noteTitle = document.getElementById("note-title");
const editor = document.getElementById("editor");
const fontSelect = document.getElementById("font-select");
const sizeSelect = document.getElementById("size-select");
const addImageBtn = document.getElementById("add-image-btn");
const imageInput = document.getElementById("image-input");
const drawBtn = document.getElementById("draw-btn");
const drawModal = document.getElementById("draw-modal");
const drawCanvas = document.getElementById("draw-canvas");
const clearCanvasBtn = document.getElementById("clear-canvas");
const saveCanvasBtn = document.getElementById("save-canvas");
const closeCanvasBtn = document.getElementById("close-canvas");
const addSubnoteBtn = document.getElementById("add-subnote-btn");
const subnoteText = document.getElementById("subnote-text");
const subnotesList = document.getElementById("subnotes-list");
const deleteNoteBtn = document.getElementById('delete-note-btn');

let notes = JSON.parse(localStorage.getItem("notes")) || [];
let currentNoteId = null;

function saveNotes() {
  localStorage.setItem("notes", JSON.stringify(notes));
}

function createNewNote() {
  const id = Date.now().toString();
  const note = {
    id,
    title: "Untitled",
    content: "",
    subnotes: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  notes.unshift(note);
  saveNotes();
  renderNotesList();
  openNote(id);
}

function renderNotesList(filter = "") {
  notesList.innerHTML = "";
  notes.forEach(n => {
    if (filter && !n.title.toLowerCase().includes(filter.toLowerCase()) && !n.content.toLowerCase().includes(filter.toLowerCase())) return;
    const li = document.createElement("li");
    li.dataset.id = n.id;
    li.innerHTML = `<div class="title">${escapeHtml(n.title || 'Untitled')}</div>
                    <div class="snippet">${escapeHtml(getSnippet(n.content))}</div>
                    <div class="meta">${new Date(n.updatedAt).toLocaleString()}</div>`;
    if (n.id === currentNoteId) li.classList.add("active");
    li.addEventListener("click", () => openNote(n.id));
    notesList.appendChild(li);
  });
}

function getSnippet(html) {
  const tmp = document.createElement('div'); tmp.innerHTML = html || '';
  const txt = tmp.innerText.replace(/\s+/g,' ').trim();
  return txt.length > 80 ? txt.slice(0,80) + '…' : txt;
}

function escapeHtml(str) {
  return (str+'').replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; });
}

function openNote(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  currentNoteId = id;
  noteTitle.value = n.title;
  editor.innerHTML = n.content || "";
  renderSubnotes();
  renderNotesList(searchInput.value);
}

function updateCurrentNote() {
  if (!currentNoteId) return;
  const n = notes.find(x => x.id === currentNoteId);
  if (!n) return;
  n.title = noteTitle.value || "Untitled";
  n.content = editor.innerHTML;
  n.updatedAt = Date.now();
  saveNotes();
  renderNotesList(searchInput.value);
}

// simple debounced save while typing
let saveTimer;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(updateCurrentNote, 400);
}

// Subnotes
function renderSubnotes() {
  subnotesList.innerHTML = "";
  const n = notes.find(x => x.id === currentNoteId);
  if (!n) return;
  n.subnotes.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = `<div contenteditable="true" class="subnote-item" data-id="${s.id}">${s.text}</div> <button class="del-sub">×</button>`;
    li.querySelector('.del-sub').addEventListener('click', () => {
      n.subnotes = n.subnotes.filter(x => x.id !== s.id);
      saveNotes();
      renderSubnotes();
    });
    const editable = li.querySelector('.subnote-item');
    editable.addEventListener('input', (e) => {
      s.text = editable.innerText;
      saveNotes();
    });
    subnotesList.appendChild(li);
  });
}

// Toolbar actions
document.querySelectorAll('.toolbar button[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd;
    document.execCommand(cmd, false, null);
    scheduleSave();
  });
});

fontSelect.addEventListener('change', () => {
  const font = fontSelect.value;
  document.execCommand('fontName', false, font);
  scheduleSave();
});

sizeSelect.addEventListener('change', () => {
  const size = sizeSelect.value;
  // wrap selection in span with font-size
  wrapSelection(`<span style="font-size:${size}">`, '</span>');
  scheduleSave();
});

function wrapSelection(startTag, endTag) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const content = range.extractContents();
  const wrapper = document.createElement('div');
  wrapper.innerHTML = startTag + contentToString(content) + endTag;
  range.insertNode(wrapper);
}

function contentToString(fragment) {
  const div = document.createElement('div');
  div.appendChild(fragment.cloneNode(true));
  return div.innerHTML;
}

// Image insert
addImageBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    insertHTMLAtCursor(`<img src="${reader.result}">`);
    scheduleSave();
  };
  reader.readAsDataURL(file);
});

function insertHTMLAtCursor(html) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const el = document.createElement('div');
  el.innerHTML = html;
  const frag = document.createDocumentFragment();
  let node, lastNode;
  while ((node = el.firstChild)) {
    lastNode = frag.appendChild(node);
  }
  range.insertNode(frag);
}

// Draw modal
let drawing = false;
const ctx = drawCanvas.getContext('2d');
function openDrawModal() {
  drawModal.style.display = 'flex';
  drawCanvas.width = 600; drawCanvas.height = 400;
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,drawCanvas.width, drawCanvas.height);
}

drawBtn.addEventListener('click', openDrawModal);

let lastX = 0, lastY = 0;
function getPos(e){
  const rect = drawCanvas.getBoundingClientRect();
  return {x: (e.clientX - rect.left), y: (e.clientY - rect.top)};
}

drawCanvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); lastX = p.x; lastY = p.y; });
drawCanvas.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; });
window.addEventListener('mouseup', () => drawing = false);

// touch support for drawing
drawCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const t = e.touches[0]; const p = getPos(t); lastX = p.x; lastY = p.y; });
drawCanvas.addEventListener('touchmove', (e) => { if (!drawing) return; e.preventDefault(); const t = e.touches[0]; const p = getPos(t); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; });
window.addEventListener('touchend', () => drawing = false);

clearCanvasBtn.addEventListener('click', () => { ctx.clearRect(0,0,drawCanvas.width, drawCanvas.height); ctx.fillStyle='#fff'; ctx.fillRect(0,0,drawCanvas.width, drawCanvas.height); });
closeCanvasBtn.addEventListener('click', () => { drawModal.style.display='none'; });
saveCanvasBtn.addEventListener('click', () => { const data = drawCanvas.toDataURL('image/png'); insertHTMLAtCursor(`<img src="${data}">`); drawModal.style.display='none'; scheduleSave(); });

// Subnotes
addSubnoteBtn.addEventListener('click', () => {
  const txt = subnoteText.value.trim();
  if (!txt || !currentNoteId) return;
  const n = notes.find(x => x.id === currentNoteId);
  n.subnotes.push({ id: Date.now().toString(), text: txt });
  subnoteText.value = '';
  saveNotes();
  renderSubnotes();
});

// Editor and title save
noteTitle.addEventListener('input', scheduleSave);
editor.addEventListener('input', scheduleSave);

// New note and search
newNoteBtn.addEventListener('click', createNewNote);
searchInput.addEventListener('input', () => renderNotesList(searchInput.value));

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); updateCurrentNote(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); createNewNote(); }
});

// export (simple JSON download)
const exportBtn = document.getElementById('export-btn');
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(notes, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'notes-export.json'; a.click(); URL.revokeObjectURL(url);
});

deleteNoteBtn.addEventListener('click', () => {
  if (!currentNoteId) return;
  const idx = notes.findIndex(x => x.id === currentNoteId);
  if (idx === -1) return;
  if (!confirm('Delete this note?')) return;
  notes.splice(idx, 1);
  saveNotes();
  if (notes.length) openNote(notes[Math.max(0, idx-1)].id);
  else createNewNote();
});

// Initialize
if (notes.length) {
  openNote(notes[0].id);
} else {
  createNewNote();
}

renderNotesList();
