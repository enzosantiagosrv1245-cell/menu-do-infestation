const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

// --- Criar pasta data se não existir ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// --- Inicializa arquivos JSON se não existirem ---
if (!fs.existsSync(USERS_FILE)) fs.writeJsonSync(USERS_FILE, {});
if (!fs.existsSync(MESSAGES_FILE)) fs.writeJsonSync(MESSAGES_FILE, {});
if (!fs.existsSync(LINKS_FILE)) fs.writeJsonSync(LINKS_FILE, []);

// --- Carregar dados ---
let users = fs.readJsonSync(USERS_FILE);
let messages = fs.readJsonSync(MESSAGES_FILE); // {username: [{from, msg, timestamp}]}
let links = fs.readJsonSync(LINKS_FILE);

app.use(express.static(__dirname));
app.use(express.json());

// --- Helpers ---
function saveUsers() {
  fs.writeJsonSync(USERS_FILE, users, { spaces: 2 });
}

function saveMessages() {
  fs.writeJsonSync(MESSAGES_FILE, messages, { spaces: 2 });
}

function saveLinks() {
  fs.writeJsonSync(LINKS_FILE, links, { spaces: 2 });
}

function generateID() {
  return "ID" + Math.floor(Math.random() * 1000000);
}

// --- Socket.IO ---
let sockets = {}; // username -> socket.id

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

    // Enviar histórico de mensagens do usuário
    if (!messages[username]) messages[username] = [];
    socket.emit("messageHistory", messages[username]);

    socket.emit("loginSuccess", users[username]);
  });

  // --- Links ---
  socket.on("newLink", url => {
    links.push(url);
    saveLinks();
    io.emit("broadcastLink", url); // todos recebem
  });

  // --- Checar usuário ---
  socket.on("checkUserExists", (username, callback) => {
    callback(!!users[username]);
  });

  // --- Pedidos de amizade ---
  socket.on("friendRequest", ({ from, to }) => {
    if (!users[to]) return;
    if (!users[to].requests.includes(from) && !users[to].friends.includes(from)) {
      users[to].requests.push(from);
      saveUsers();
      if (sockets[to]) io.to(sockets[to]).emit("friendRequestNotification", { from, color: users[from].color });
    }
  });

  // --- Aceitar pedido ---
  socket.on("acceptRequest", ({ from, to }) => {
    if (!users[to] || !users[from]) return;
    if (!users[to].friends.includes(from)) users[to].friends.push(from);
    if (!users[from].friends.includes(to)) users[from].friends.push(to);
    users[to].requests = users[to].requests.filter(r => r !== from);
    saveUsers();
    if (sockets[from]) io.to(sockets[from]).emit("friendAccepted", { from: to });
    if (sockets[to]) io.to(sockets[to]).emit("friendAccepted", { from });
  });

  // --- Recusar pedido ---
  socket.on("rejectRequest", ({ from, to }) => {
    if (!users[to]) return;
    users[to].requests = users[to].requests.filter(r => r !== from);
    saveUsers();
  });

  // --- Chat DM ---
  socket.on("dm", ({ to, msg }) => {
    if (!users[to]) return;
    const timestamp = Date.now();
    const message = { from: socket.username, msg, timestamp };

    // Salvar mensagem para o receptor
    if (!messages[to]) messages[to] = [];
    messages[to].push(message);
    saveMessages();

    // Salvar mensagem para o remetente (histórico)
    if (!messages[socket.username]) messages[socket.username] = [];
    messages[socket.username].push(message);
    saveMessages();

    // Enviar ao usuário se online
    if (sockets[to]) io.to(sockets[to]).emit("dm", message);
  });

  // --- Configurações ---
  socket.on("changeName", ({ oldName, newName }) => {
    if (!users[oldName]) return;
    if (users[newName]) return;
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
