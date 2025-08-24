const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "users.json");

app.use(express.static(__dirname));
app.use(express.json());

let users = {};
let sockets = {};
let links = [];

if (fs.existsSync(DATA_FILE)) users = fs.readJsonSync(DATA_FILE);

function saveUsers() {
  fs.writeJsonSync(DATA_FILE, users, { spaces: 2 });
}

function generateID() {
  return "ID" + Math.floor(Math.random() * 1000000);
}

io.on("connection", socket => {
  console.log("Novo jogador conectado:", socket.id);

  socket.on("register", ({ username, password }) => {
    if (users[username]) return socket.emit("registerError", "Usuário já existe!");
    const id = generateID();
    users[username] = { id, username, password, color: "#3498db", photo: null, editedName: false, friends: [], requests: [] };
    saveUsers();
    socket.emit("registerSuccess", users[username]);
  });

  socket.on("login", ({ username, password }) => {
    if (!users[username] || users[username].password !== password) return socket.emit("loginError", "Usuário ou senha incorretos!");
    socket.username = username;
    sockets[username] = socket.id;
    socket.emit("loginSuccess", users[username]);
  });

  socket.on("newLink", url => {
    links.push(url);
    socket.broadcast.emit("broadcastLink", url);
  });

  socket.on("checkUserExists", (username, callback) => callback(!!users[username]));

  socket.on("friendRequest", ({ from, to }) => {
    if (!users[to]) return;
    if (!users[to].requests.includes(from) && !users[to].friends.includes(from)) {
      users[to].requests.push(from);
      saveUsers();
      if (sockets[to]) io.to(sockets[to]).emit("friendRequestNotification", { from, color: users[from].color, photo: users[from].photo });
    }
  });

  socket.on("acceptRequest", ({ from, to }) => {
    if (!users[to] || !users[from]) return;
    if (!users[to].friends.includes(from)) users[to].friends.push(from);
    if (!users[from].friends.includes(to)) users[from].friends.push(to);
    users[to].requests = users[to].requests.filter(r => r !== from);
    saveUsers();
    if (sockets[from]) io.to(sockets[from]).emit("friendAccepted", { from: to });
    if (sockets[to]) io.to(sockets[to]).emit("friendAccepted", { from });
  });

  socket.on("rejectRequest", ({ from, to }) => {
    if (!users[to]) return;
    users[to].requests = users[to].requests.filter(r => r !== from);
    saveUsers();
  });

  socket.on("dm", ({ to, msg }) => {
    if (!sockets[to]) return;
    io.to(sockets[to]).emit("dm", { from: socket.username, msg });
  });

  socket.on("changeName", ({ oldName, newName }) => {
    if (!users[oldName] || users[newName]) return;
    users[newName] = { ...users[oldName], username: newName, editedName: true };
    delete users[oldName];
    saveUsers();
    if (sockets[newName]) io.to(sockets[newName]).emit("nameChanged", { newName });
    if (sockets[oldName]) delete sockets[oldName];
    sockets[newName] = socket.id;
  });

  socket.on("changePassword", ({ username, newPass }) => {
    if (!users[username]) return;
    users[username].password = newPass;
    saveUsers();
    socket.emit("passwordChanged");
  });

  socket.on("changeColor", ({ username, color }) => {
    if (!users[username]) return;
    users[username].color = color;
    saveUsers();
  });

  socket.on("changePhoto", ({ username, photo }) => {
    if (!users[username]) return;
    users[username].photo = photo;
    saveUsers();
  });

  socket.on("disconnect", () => {
    if (socket.username) delete sockets[socket.username];
    console.log("Desconectado:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
