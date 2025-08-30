const addBtn = document.getElementById("add-btn");
const noteText = document.getElementById("note-text");
const notesContainer = document.getElementById("notes-container");

// Load from localStorage
document.addEventListener("DOMContentLoaded", () => {
  const savedNotes = JSON.parse(localStorage.getItem("notes")) || [];
  savedNotes.forEach(note => createNote(note));
});

addBtn.addEventListener("click", () => {
  const text = noteText.value.trim();
  if (text === "") return;

  createNote(text);

  saveNotes();

  noteText.value = "";
});

function createNote(text) {
  const note = document.createElement("div");
  note.classList.add("note");
  note.innerText = text;

  const delBtn = document.createElement("button");
  delBtn.innerText = "×";
  delBtn.classList.add("delete-btn");
  delBtn.addEventListener("click", () => {
    note.remove();
    saveNotes();
  });

  note.appendChild(delBtn);
  notesContainer.appendChild(note);
}

function saveNotes() {
  const notes = [];
  document.querySelectorAll(".note").forEach(note => {
    notes.push(note.innerText.replace("×", "").trim());
  });
  localStorage.setItem("notes", JSON.stringify(notes));
}
