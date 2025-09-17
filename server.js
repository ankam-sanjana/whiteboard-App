// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Simple server-side "current" state so new clients get the board + notes
let boardState = {
  img: null,      // dataURL of canvas
  notes: []       // array of { id, type: 'note'|'image', content, x, y, w, h, minimized }
};

io.on("connection", (socket) => {
  console.log("connect:", socket.id);

  // send initial state to new client
  socket.emit("init", boardState);

  socket.on("draw", (d) => socket.broadcast.emit("draw", d));

  // When client saves current canvas (on mouseup or undo/redo), update server state
  socket.on("setCanvas", (dataURL) => {
    boardState.img = dataURL || null;
    socket.broadcast.emit("setCanvas", dataURL);
  });

  socket.on("clear", () => {
    boardState.img = null;
    boardState.notes = [];
    io.emit("clear");
  });

  // Notes & Images
  socket.on("addNote", (note) => {
    boardState.notes.push(note);
    socket.broadcast.emit("addNote", note);
  });
  socket.on("updateNote", (note) => {
    boardState.notes = boardState.notes.map(n => n.id === note.id ? {...n, ...note} : n);
    socket.broadcast.emit("updateNote", note);
  });
  socket.on("moveNote", (note) => {
    boardState.notes = boardState.notes.map(n => n.id === note.id ? {...n, x: note.x, y: note.y} : n);
    socket.broadcast.emit("moveNote", note);
  });
  socket.on("removeNote", (id) => {
    boardState.notes = boardState.notes.filter(n => n.id !== id);
    socket.broadcast.emit("removeNote", id);
  });

  // Cursor presence (lightweight)
  socket.on("cursor", (c) => socket.broadcast.emit("cursor", { id: socket.id, name: c.name, color: c.color, x: c.x, y: c.y }));
  socket.on("disconnect", () => {
    console.log("disconnect:", socket.id);
    socket.broadcast.emit("removeCursor", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
