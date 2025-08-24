const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// --- Arquivos de dados ---
const USERS_FILE = path.join(__dirname, "users.json");
const MESSAGES_FILE = path.join(__dirname, "messages.json");
const LINKS_FILE = path.join(__dirname, "links.json");

// --- Middleware ---
app.use(express.static(__dirname));
app.use(express.json());

// --- Dados na memória ---
let users = {};
let sockets = {}; // username -> socket.id
let messages = {};
let links = [];

// --- Carregar arquivos ---
if (fs.existsSync(USERS_FILE)) users = fs.readJsonSync(USERS_FILE);
if (fs.existsSync(MESSAGES_FILE)) messages = fs.readJsonSync(MESSAGES_FILE);
if (fs.existsSync(LINKS_FILE)) links = fs.readJsonSync(LINKS_FILE);

// --- Funções de salvamento ---
function saveUsers() { fs.writeJsonSync(USERS_FILE, users, { spaces: 2 }); }
function saveMessages() { fs.writeJsonSync(MESSAGES_FILE, messages, { spaces: 2 }); }
function saveLinks() { fs.writeJsonSync(LINKS_FILE, links, { spaces: 2 }); }

function generateID() { return "ID" + Math.floor(Math.random() * 1000000); }

// --- Socket.IO ---
io.on("connection", socket => {
  console.log("Novo jogador conectado:", socket.id);

  // --- Registro ---
  socket.on("register", ({ username, password }) => {
    if (users[username]) return socket.emit("registerError", "Usuário já existe!");
    const id = generateID();
    users[username] = {
      id,
      username,
      password,
      color: "#3498db",
      photo: null,
      editedName: false,
      friends: [],
      requests: []
    };
    saveUsers();
    socket.emit("registerSuccess", users[username]);
  });

  // --- Login ---
  socket.on("login", ({ username, password }) => {
    if (!users[username] || users[username].password !== password) 
      return socket.emit("loginError", "Usuário ou senha incorretos!");
    socket.username = username;
    sockets[username] = socket.id;

    // Enviar histórico de mensagens para o usuário
    if (!messages[username]) messages[username] = {};
    socket.emit("loginSuccess", users[username]);
  });

  // --- Links ---
  socket.on("newLink", url => {
    if (!links.includes(url)) {
      links.push(url);
      saveLinks();
      socket.broadcast.emit("broadcastLink", url);
    }
  });

  // --- Checar se usuário existe ---
  socket.on("checkUserExists", (username, callback) => callback(!!users[username]));

  // --- Pedidos de amizade ---
  socket.on("friendRequest", ({ from, to, photo }) => {
    if (!users[to]) return;
    if (!users[to].requests.includes(from) && !users[to].friends.includes(from)) {
      users[to].requests.push(from);
      saveUsers();
      if (sockets[to]) {
        io.to(sockets[to]).emit("friendRequestNotification", { from, color: users[from].color, photo });
      }
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

  // --- Chat DM ---
  socket.on("dm", ({ to, msg }) => {
    if (!users[to]) return;

    // Salvar mensagem
    if (!messages[to]) messages[to] = {};
    if (!messages[to][socket.username]) messages[to][socket.username] = [];
    messages[to][socket.username].push({ sender: socket.username, msg, timestamp: Date.now() });

    if (!messages[socket.username]) messages[socket.username] = {};
    if (!messages[socket.username][to]) messages[socket.username][to] = [];
    messages[socket.username][to].push({ sender: socket.username, msg, timestamp: Date.now() });

    saveMessages();

    if (sockets[to]) io.to(sockets[to]).emit("dm", { from: socket.username, msg });
  });

  // --- Configurações ---
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

  // --- Desconexão ---
  socket.on("disconnect", () => {
    if (socket.username) delete sockets[socket.username];
    console.log("Desconectado:", socket.id);
  });
});

// --- Servidor ---
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));