const socket = io();

// 🎨 Canvas setup
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 60;

let drawing = false;
let tool = "pencil";
let fontFamily = "Arial";
let fontSize = 20;
let isBold = false;
let isItalic = false;
let color = document.getElementById("color").value;
let size = document.getElementById("size").value;
let isSelecting = false;
let selection = null;
let moving = false;
let selectionOffsetX = 0;
let selectionOffsetY = 0;
let startX, startY;
let snapshot;
let undoStack = [];
let redoStack = [];

// 🖌️ Drawing
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  startX = e.clientX;
  startY = e.clientY;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (tool === "pencil" || tool === "eraser") saveState();
});

canvas.addEventListener("mouseup", () => {
  if (!drawing) return;
  drawing = false;
  saveState(); // Save final shape
});


canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;

  let endX = e.clientX;
  let endY = e.clientY;

  if (tool === "pencil" || tool === "eraser") {
    ctx.strokeStyle = tool === "eraser" ? "white" : color;
    ctx.lineWidth = size;
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else if (tool === "line" || tool === "rect" || tool === "circle") {
    ctx.putImageData(snapshot, 0, 0); // restore saved state

    ctx.strokeStyle = color;
    ctx.lineWidth = size;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(startX, startY, endX - startX, endY - startY);
    } else if (tool === "circle") {
      let radius = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
      );
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  // Emit live shapes (optional for collaboration)
});



// 📡 Receive drawing from others
socket.on("draw", (data) => {
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.size;
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
});

// 🎯 Tools
document.getElementById("pencil").onclick = () => (tool = "pencil");
document.getElementById("eraser").onclick = () => (tool = "eraser");
document.getElementById("color").oninput = (e) => (color = e.target.value);
document.getElementById("size").oninput = (e) => (size = e.target.value);
document.getElementById("line").onclick = () => (tool = "line");
document.getElementById("rect").onclick = () => (tool = "rect");
document.getElementById("circle").onclick = () => (tool = "circle");
document.getElementById("text").onclick = () => (tool = "text");
document.getElementById("font-family").onchange = (e) => {
  fontFamily = e.target.value;
};

document.getElementById("font-size").onchange = (e) => {
  fontSize = parseInt(e.target.value);
};

document.getElementById("bold").onclick = () => {
  isBold = !isBold;
  document.getElementById("bold").style.background = isBold ? "#ddd" : "";
};

document.getElementById("italic").onclick = () => {
  isItalic = !isItalic;
  document.getElementById("italic").style.background = isItalic ? "#ddd" : "";
};

// ↩️ Undo/Redo
function saveState() {
  undoStack.push(canvas.toDataURL());
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
}
document.getElementById("undo").onclick = () => {
  if (undoStack.length) {
    redoStack.push(undoStack.pop());
    restoreState(undoStack[undoStack.length - 1]);
  }
};
document.getElementById("redo").onclick = () => {
  if (redoStack.length) {
    let state = redoStack.pop();
    undoStack.push(state);
    restoreState(state);
  }
};
function restoreState(state) {
  let img = new Image();
  img.src = state;
  img.onload = () => ctx.drawImage(img, 0, 0);
}

// 🟨 Sticky Note
document.getElementById("note").onclick = () => {
  const note = document.createElement("div");
  note.className = "sticky";

  const header = document.createElement("div");
  header.className = "sticky-header";

  // Minimize Button
  const minimizeBtn = document.createElement("button");
  minimizeBtn.innerText = "🔽";
  minimizeBtn.className = "minimize";

  // Close Button
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "❌";

  const content = document.createElement("div");
  content.contentEditable = true;
  content.innerText = "Write here...";

  minimizeBtn.onclick = () => {
    if (content.style.display === "none") {
      content.style.display = "block";
      minimizeBtn.innerText = "🔽";
    } else {
      content.style.display = "none";
      minimizeBtn.innerText = "🔼";
    }
  };

  closeBtn.onclick = () => note.remove();

  header.appendChild(minimizeBtn);
  header.appendChild(closeBtn);

  note.appendChild(header);
  note.appendChild(content);
  document.body.appendChild(note);

  makeDraggable(note, header);
};



// 🖼️ Sticky Image
document.getElementById("image").onclick = () => {
  let input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    let file = e.target.files[0];
    let reader = new FileReader();
    reader.onload = (ev) => {
      const note = document.createElement("div");
      note.className = "sticky";

      const header = document.createElement("div");
      header.className = "sticky-header";

      // Minimize Button
      const minimizeBtn = document.createElement("button");
      minimizeBtn.innerText = "🔽";
      minimizeBtn.className = "minimize";

      // Close Button
      const closeBtn = document.createElement("button");
      closeBtn.innerText = "❌";

      const img = document.createElement("img");
      img.src = ev.target.result;

      minimizeBtn.onclick = () => {
        if (img.style.display === "none") {
          img.style.display = "block";
          minimizeBtn.innerText = "🔽";
        } else {
          img.style.display = "none";
          minimizeBtn.innerText = "🔼";
        }
      };

      closeBtn.onclick = () => note.remove();

      header.appendChild(minimizeBtn);
      header.appendChild(closeBtn);

      note.appendChild(header);
      note.appendChild(img);
      document.body.appendChild(note);

      makeDraggable(note, header);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};



// 📦 Download
document.getElementById("download").onclick = () => {
  let link = document.createElement("a");
  link.download = "whiteboard.png";
  link.href = canvas.toDataURL();
  link.click();
};

// 🗑️ Clear
document.getElementById("clear").onclick = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  socket.emit("clear");
};
socket.on("clear", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// 🖱️ Make Sticky Notes Draggable
function makeDraggable(el) {
  el.onmousedown = function (e) {
    let shiftX = e.clientX - el.getBoundingClientRect().left;
    let shiftY = e.clientY - el.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      el.style.left = pageX - shiftX + "px";
      el.style.top = pageY - shiftY + "px";
    }

    function onMouseMove(e) {
      moveAt(e.pageX, e.pageY);
    }

    document.addEventListener("mousemove", onMouseMove);
    el.onmouseup = function () {
      document.removeEventListener("mousemove", onMouseMove);
      el.onmouseup = null;
    };
  };
  el.ondragstart = () => false;
}


// ======================
// 💾 SAVE / LOAD FEATURE
// ======================

// Save current state to localStorage
function saveBoard() {
  // Save canvas
  localStorage.setItem("boardCanvas", canvas.toDataURL());

  // Save sticky notes/images
  const stickies = [];
  document.querySelectorAll(".sticky").forEach((note) => {
    const contentEl = note.querySelector("div[contenteditable], img");
    stickies.push({
      type: contentEl.tagName === "IMG" ? "image" : "note",
      content: contentEl.tagName === "IMG" ? contentEl.src : contentEl.innerText,
      left: note.style.left,
      top: note.style.top,
      width: note.style.width,
      height: note.style.height,
      minimized:
        contentEl.style.display === "none" ? true : false,
    });
  });
  localStorage.setItem("stickies", JSON.stringify(stickies));
}

// Load saved state from localStorage
function loadBoard() {
  // Restore canvas
  const savedCanvas = localStorage.getItem("boardCanvas");
  if (savedCanvas) {
    let img = new Image();
    img.src = savedCanvas;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }

  // Restore sticky notes/images
  const savedStickies = JSON.parse(localStorage.getItem("stickies") || "[]");
  savedStickies.forEach((s) => {
    const note = document.createElement("div");
    note.className = "sticky";
    note.style.left = s.left || "100px";
    note.style.top = s.top || "100px";
    if (s.width) note.style.width = s.width;
    if (s.height) note.style.height = s.height;

    const header = document.createElement("div");
    header.className = "sticky-header";

    const minimizeBtn = document.createElement("button");
    minimizeBtn.innerText = s.minimized ? "🔼" : "🔽";
    minimizeBtn.className = "minimize";

    const closeBtn = document.createElement("button");
    closeBtn.innerText = "❌";

    header.appendChild(minimizeBtn);
    header.appendChild(closeBtn);
    note.appendChild(header);

    let content;
    if (s.type === "image") {
      content = document.createElement("img");
      content.src = s.content;
    } else {
      content = document.createElement("div");
      content.contentEditable = true;
      content.innerText = s.content;
    }

    if (s.minimized) content.style.display = "none";
    minimizeBtn.onclick = () => {
      if (content.style.display === "none") {
        content.style.display = "block";
        minimizeBtn.innerText = "🔽";
      } else {
        content.style.display = "none";
        minimizeBtn.innerText = "🔼";
      }
      saveBoard();
    };

    closeBtn.onclick = () => {
      note.remove();
      saveBoard();
    };

    note.appendChild(content);
    document.body.appendChild(note);

    makeDraggable(note, header);
  });
}

// Auto-load when page starts
window.onload = loadBoard;

// Auto-save every 2 seconds
setInterval(saveBoard, 2000);

canvas.addEventListener("click", (e) => {
  if (tool !== "text") return;

  let input = document.createElement("input");
  input.type = "text";
  input.style.position = "absolute";
  input.style.left = e.clientX + "px";
  input.style.top = e.clientY + "px";
  input.style.font = `${size * 5}px Arial`; // scale text size with tool size
  input.style.border = "1px solid #ccc";
  input.style.background = "white";
  input.style.zIndex = 1000;
  input.style.font = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}${fontSize}px ${fontFamily}`;
  input.style.color = document.getElementById("color").value;  // so text color matches selected color

  document.body.appendChild(input);
  input.focus();

  input.onkeydown = function (event) {
    if (event.key === "Enter") {
      let text = input.value;
      ctx.fillStyle = color;
      ctx.font = `${size * 5}px Arial`;
      ctx.fillText(text, e.clientX, e.clientY);
      document.body.removeChild(input);
      saveState();
    }
  };

  input.onblur = function () {
    let text = input.value;
    if (text) {
      ctx.fillStyle = color;
      ctx.font = `${size * 5}px Arial`;
      ctx.fillText(text, e.clientX, e.clientY);
      saveState();
    }
    document.body.removeChild(input);
  };
});

// ==========================
// Text Tool
// ==========================
document.getElementById("text").onclick = () => (tool = "text");

canvas.addEventListener("click", (e) => {
  if (tool !== "text") return;

  // Create input box
  let input = document.createElement("input");
  input.type = "text";
  input.style.position = "absolute";
  input.style.left = e.clientX + "px";
  input.style.top = e.clientY + "px";
  input.style.zIndex = 1000;
  input.style.border = "1px solid #ccc";
  input.style.background = "white";
  input.style.outline = "none";

  // Apply selected font styles
  let fontStyleStr = "";
  if (isItalic) fontStyleStr += "italic ";
  if (isBold) fontStyleStr += "bold ";
  input.style.font = `${fontStyleStr}${fontSize}px ${fontFamily}`;
  input.style.color = color;

  document.body.appendChild(input);
  input.focus();

  // Press Enter to finalize text
  input.onkeydown = function (event) {
    if (event.key === "Enter") {
      if (input.value) {
        ctx.fillStyle = color;
        ctx.font = `${fontStyleStr}${fontSize}px ${fontFamily}`;
        ctx.fillText(input.value, e.clientX, e.clientY);
        saveState();
      }
      document.body.removeChild(input);
    }
  };

  // Click away to finalize
  input.onblur = function () {
    if (input.value) {
      ctx.fillStyle = color;
      ctx.font = `${fontStyleStr}${fontSize}px ${fontFamily}`;
      ctx.fillText(input.value, e.clientX, e.clientY);
      saveState();
    }
    document.body.removeChild(input);
  };
});
