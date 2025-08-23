document.addEventListener("DOMContentLoaded", () => {

  // --- Canvas animado ---
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  let hue = 0;
  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${hue},60%,15%)`);
    gradient.addColorStop(1, `hsl(${(hue+180)%360},60%,25%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hue += 0.3;
    requestAnimationFrame(drawCanvas);
  }
  drawCanvas();

  // --- Socket.IO ---
  const SERVER_URL = "https://menu-do-infestation.onrender.com";
  const socket = io(SERVER_URL);

  // --- Variáveis globais ---
  let currentUser = null;
  let userProfile = null;
  let activeChatFriend = null;
  let chatHistory = {}; // {friend: [{from, msg}]}

  // --- Links ---
  const linksContainer = document.getElementById("linksContainer");
  const addLinkBtn = document.getElementById("addLinkBtn");
  const linkInput = document.getElementById("linkInput");
  let linkQueue = [];

  addLinkBtn.addEventListener("click", () => {
    const url = linkInput.value.trim();
    linkInput.value = "";
    if (!url) return;
    if (isValidUrl(url)) {
      linkQueue.push(url);
      renderLinks();
      socket.emit("newLink", url);
    } else showNotification("Link inválido!", "red");
  });

  function renderLinks() {
    linksContainer.innerHTML = "";
    linkQueue.forEach(url => {
      const div = document.createElement("div");
      div.className = "link-square";
      div.title = url;
      div.textContent = new URL(url).hostname;
      div.onclick = () => window.open(url, "_blank");
      linksContainer.appendChild(div);
    });
  }

  function isValidUrl(string) {
    try { new URL(string); return true; } catch { return false; }
  }

  socket.on("broadcastLink", url => {
    if (!linkQueue.includes(url)) {
      linkQueue.push(url);
      renderLinks();
    }
  });

  // --- Login/Registro ---
  const loginBtn = document.getElementById("loginBtn");
  const loginModal = document.getElementById("loginModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const registerBtn = document.getElementById("registerBtn");
  const loginSubmitBtn = document.getElementById("loginSubmitBtn");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  loginBtn.addEventListener("click", () => loginModal.classList.remove("hidden"));
  closeModalBtn.addEventListener("click", () => loginModal.classList.add("hidden"));

  registerBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return showNotification("Preencha todos os campos!", "red");
    socket.emit("register", {username: user, password: pass});
  });

  loginSubmitBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return showNotification("Preencha todos os campos!", "red");
    socket.emit("login", {username: user, password: pass});
  });

  socket.on("registerSuccess", data => showNotification("Conta criada!", "green"));
  socket.on("registerError", msg => showNotification(msg, "red"));

  socket.on("loginSuccess", data => {
    currentUser = data.username;
    userProfile = data;
    loginModal.classList.add("hidden");
    loginBtn.style.display = "none";
    createProfileUI();
    showNotification("Login realizado!", "green");
  });

  socket.on("loginError", msg => showNotification(msg, "red"));

  // --- Perfil ---
  const profileContainer = document.getElementById("profileBallContainer");
  const profileMenu = document.getElementById("profileMenu");

  function createProfileUI() {
    profileContainer.innerHTML = "";
    const ball = document.createElement("div");
    ball.className = "profile-ball";
    ball.textContent = userProfile.username[0].toUpperCase();
    if (userProfile.photo) {
      ball.style.backgroundImage = `url(${userProfile.photo})`;
      ball.style.backgroundSize = "cover";
      ball.textContent = "";
    } else {
      ball.style.backgroundColor = userProfile.color || "#3498db";
    }
    profileContainer.appendChild(ball);
    ball.addEventListener("click", () => profileMenu.classList.toggle("hidden"));
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    currentUser = null;
    userProfile = null;
    profileMenu.classList.add("hidden");
    profileContainer.innerHTML = "";
    loginBtn.style.display = "block";
    showNotification("Logout realizado!", "yellow");
  });

  // --- Amigos ---
  const friendsBtn = document.getElementById("friendsBtn");
  const friendsModal = document.getElementById("friendsModal");
  const friendsList = document.getElementById("friendsList");
  const requestsList = document.getElementById("requestsList");
  const friendInput = document.getElementById("friendInput");
  const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");

  friendsBtn.addEventListener("click", () => {
    if (!currentUser) return showNotification("Faça login primeiro!", "red");
    friendsModal.classList.remove("hidden");
    renderFriends();
    renderRequests();
  });

  function renderFriends() {
    friendsList.innerHTML = "";
    if (!userProfile.friends) userProfile.friends = [];
    userProfile.friends.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      const dmBtn = document.createElement("button");
      dmBtn.textContent = "Chat";
      dmBtn.onclick = () => openChat(f);
      li.appendChild(dmBtn);
      friendsList.appendChild(li);
    });
  }

  function renderRequests() {
    requestsList.innerHTML = "";
    if (!userProfile.requests) userProfile.requests = [];
    userProfile.requests.forEach(req => {
      const li = document.createElement("li");
      li.textContent = req;
      const acceptBtn = document.createElement("button");
      acceptBtn.textContent = "Aceitar";
      acceptBtn.onclick = () => {
        socket.emit("acceptRequest", {from:req,to:currentUser});
        userProfile.friends.push(req);
        userProfile.requests = userProfile.requests.filter(r => r!==req);
        renderFriends();
        renderRequests();
        showNotification(`Amizade aceita: ${req}`,"green");
      };
      const rejectBtn = document.createElement("button");
      rejectBtn.textContent = "Recusar";
      rejectBtn.onclick = () => {
        socket.emit("rejectRequest", {from:req,to:currentUser});
        userProfile.requests = userProfile.requests.filter(r => r!==req);
        renderRequests();
        showNotification(`Pedido recusado: ${req}`,"red");
      };
      li.appendChild(acceptBtn);
      li.appendChild(rejectBtn);
      requestsList.appendChild(li);
    });
  }

  sendFriendRequestBtn.addEventListener("click", () => {
    const target = friendInput.value.trim();
    if (!target) return showNotification("Digite o nome do jogador!","red");
    if (target === currentUser) return showNotification("Não pode enviar para você mesmo!","red");
    socket.emit("friendRequest", {from:currentUser,to:target});
    friendInput.value = "";
    showNotification(`Pedido enviado para ${target}`,"yellow");
  });

  socket.on("friendRequest", ({from}) => {
    if (!userProfile.requests.includes(from)) {
      userProfile.requests.push(from);
      showNotification(`Novo pedido de amizade: ${from}`,"blue");
    }
  });

  socket.on("friendAccepted", ({from}) => {
    if (!userProfile.friends.includes(from)) {
      userProfile.friends.push(from);
      renderFriends();
      showNotification(`${from} aceitou sua amizade!`,"green");
    }
  });

  // --- Chat DM ---
  const chatModal = document.getElementById("chatModal");
  const chatFriendName = document.getElementById("chatFriendName");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");

  function openChat(friend) {
    activeChatFriend = friend;
    chatFriendName.textContent = friend;
    chatModal.classList.remove("hidden");
    renderChat();
  }

  function renderChat() {
    chatMessages.innerHTML = "";
    const msgs = chatHistory[activeChatFriend] || [];
    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className = "msg";
      div.innerHTML = `<span>${m.from}:</span> ${m.msg}`;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  sendChatBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keydown", e => { if(e.key==="Enter") sendMessage(); });

  function sendMessage() {
    const msg = chatInput.value.trim();
    if(!msg || !activeChatFriend) return;
    if(!chatHistory[activeChatFriend]) chatHistory[activeChatFriend] = [];
    chatHistory[activeChatFriend].push({from:currentUser,msg});
    socket.emit("dm",{to:activeChatFriend,msg});
    chatInput.value = "";
    renderChat();
  }

  socket.on("dm", ({from,msg})=>{
    if(!chatHistory[from]) chatHistory[from] = [];
    chatHistory[from].push({from,msg});
    if(activeChatFriend===from) renderChat();
    showNotification(`Nova mensagem de ${from}`,"blue");
  });

  // --- Notificações ---
  const notificationsBtn = document.getElementById("notificationsBtn");
  const notificationsModal = document.getElementById("notificationsModal");
  const notificationsList = document.getElementById("notificationsList");

  notificationsBtn.addEventListener("click",()=>notificationsModal.classList.remove("hidden"));

  function showNotification(text,color="yellow") {
    const container = document.getElementById("notificationsContainer");
    const div = document.createElement("div");
    div.className = "notification";
    div.style.backgroundColor = color;
    div.textContent = text;
    container.appendChild(div);
    setTimeout(()=>div.remove(),4000);
  }

});
