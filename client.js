document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // --- Canvas animado ---
  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const time = Date.now() * 0.0002;
    gradient.addColorStop(0, `hsl(${(time*360)%360},50%,10%)`);
    gradient.addColorStop(1, `hsl(${(time*360+180)%360},50%,20%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    requestAnimationFrame(drawCanvas);
  }
  drawCanvas();

  const socket = io();

  let currentUser = null;
  let userProfile = null;
  let linkQueue = [];

  // --- HUD e links ---
  const linksContainer = document.getElementById("linksContainer");
  const addLinkBtn = document.getElementById("addLinkBtn");
  const linkInput = document.getElementById("linkInput");

  addLinkBtn.addEventListener("click", () => {
    const url = linkInput.value.trim();
    linkInput.value = "";
    if (!url) return;
    if (isValidUrl(url)) {
      linkQueue.push(url);
      renderLinks();
      socket.emit("newLink", url);
    } else showNotification("⚠️ Link inválido!", "red");
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

  // --- Login / Registro ---
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
    if (!user || !pass) return showNotification("⚠️ Preencha todos os campos!", "red");
    socket.emit("register", { username: user, password: pass });
  });

  loginSubmitBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return showNotification("⚠️ Preencha todos os campos!", "red");
    socket.emit("login", { username: user, password: pass });
  });

  socket.on("registerSuccess", () => showNotification("✅ Conta criada!", "green"));
  socket.on("registerError", msg => showNotification("❌ " + msg, "red"));
  socket.on("loginSuccess", data => {
    currentUser = data.username;
    userProfile = data;
    loginModal.classList.add("hidden");
    loginBtn.style.display = "none";
    createProfileUI();
    updateFriendsUI();
    showNotification("🎉 Login realizado!", "green");
    renderChatFriends();
  });
  socket.on("loginError", msg => showNotification("❌ " + msg, "red"));

  // --- Perfil ---
  const profileContainer = document.getElementById("profileBallContainer");
  function createProfileUI() {
    profileContainer.innerHTML = "";
    const ball = document.createElement("div");
    ball.className = "profile-ball";
    if (userProfile.photo) {
      const img = document.createElement("img");
      img.src = userProfile.photo;
      ball.appendChild(img);
    } else {
      ball.textContent = userProfile.username[0].toUpperCase();
      ball.style.backgroundColor = userProfile.color;
    }
    profileContainer.appendChild(ball);

    ball.onclick = () => {
      showProfileMenu();
    };
  }

  function showProfileMenu() {
    const menu = document.createElement("div");
    menu.className = "generic-modal";
    menu.style.backgroundColor = "rgba(0,0,0,0.8)";
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.padding = "20px";
    menu.style.borderRadius = "10px";
    menu.style.position = "fixed";
    menu.style.top = "70px";
    menu.style.right = "20px";
    menu.style.zIndex = "3000";

    const friendsBtn = document.createElement("button");
    friendsBtn.textContent = "Amigos";
    friendsBtn.onclick = () => {
      document.getElementById("friendsModal").classList.remove("hidden");
      menu.remove();
    };

    const settingsBtn = document.createElement("button");
    settingsBtn.textContent = "Configurações";
    settingsBtn.onclick = () => {
      document.getElementById("settingsModal").classList.remove("hidden");
      menu.remove();
    };

    menu.appendChild(friendsBtn);
    menu.appendChild(settingsBtn);

    document.body.appendChild(menu);

    // Remove menu se clicar fora
    menu.addEventListener("click", e => {
      if (e.target === menu) menu.remove();
    });
  }

  // --- Notificações ---
  function showNotification(text, color = "yellow") {
    const container = document.createElement("div");
    container.className = "notification";
    container.style.backgroundColor = color;
    container.innerHTML = `<b>${text}</b>`;
    document.body.appendChild(container);
    setTimeout(() => container.remove(), 4000);
  }

  // --- Amigos ---
  const friendInput = document.getElementById("friendInput");
  const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");
  const friendsList = document.getElementById("friendsList");
  const requestsList = document.getElementById("requestsList");

  sendFriendRequestBtn.addEventListener("click", () => {
    const target = friendInput.value.trim();
    if (!target) return;
    if (target === currentUser) return showNotification("⚠️ Não pode enviar para você mesmo", "red");
    socket.emit("checkUserExists", target, exists => {
      if (!exists) return showNotification("❌ Jogador não existe", "red");
      socket.emit("friendRequest", { from: currentUser, to: target, photo: userProfile.photo });
      showNotification("📩 Pedido enviado!", "green");
    });
  });

  socket.on("friendRequestNotification", ({ from, color, photo }) => {
    userProfile.requests.push(from);
    updateFriendsUI();
    showNotification(`📩 Pedido de amizade de ${from}`, "blue");
  });

  socket.on("friendAccepted", ({ from }) => {
    if (!userProfile.friends.includes(from)) userProfile.friends.push(from);
    updateFriendsUI();
    renderChatFriends();
    showNotification(`🤝 Você e ${from} agora são amigos!`, "green");
  });

  function updateFriendsUI() {
    if (!userProfile) return;
    friendsList.innerHTML = "";
    requestsList.innerHTML = "";

    userProfile.friends.forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      li.onclick = () => openChat(f);
      friendsList.appendChild(li);
    });

    userProfile.requests.forEach(r => {
      const li = document.createElement("li");
      li.textContent = r;
      const accept = document.createElement("button");
      accept.textContent = "Aceitar";
      accept.onclick = () => {
        socket.emit("acceptRequest", { from: r, to: currentUser });
        userProfile.friends.push(r);
        userProfile.requests = userProfile.requests.filter(req => req !== r);
        updateFriendsUI();
      };
      const reject = document.createElement("button");
      reject.textContent = "Recusar";
      reject.onclick = () => {
        socket.emit("rejectRequest", { from: r, to: currentUser });
        userProfile.requests = userProfile.requests.filter(req => req !== r);
        updateFriendsUI();
      };
      li.appendChild(accept);
      li.appendChild(reject);
      requestsList.appendChild(li);
    });
  }

  // --- Chat DM ---
  const chatFriendsContainer = document.getElementById("chatFriends");
  const chatMessagesFloating = document.getElementById("chatMessagesFloating");
  const chatInputFloating = document.getElementById("chatInputFloating");
  const sendChatFloating = document.getElementById("sendChatFloating");
  let currentChat = null;
  let chatHistory = {};

  function renderChatFriends() {
    chatFriendsContainer.innerHTML = "";
    userProfile.friends.forEach(f => {
      const btn = document.createElement("div");
      btn.className = "chat-friend-btn";
      btn.textContent = f;
      btn.onclick = () => openChat(f);
      chatFriendsContainer.appendChild(btn);
    });
  }

  function openChat(friend) {
    currentChat = friend;
    chatMessagesFloating.innerHTML = `<div class="chat-header">Chat com ${friend}</div>`;
    if (!chatHistory[friend]) chatHistory[friend] = [];
    chatHistory[friend].forEach(msg => appendMessage(msg.sender, msg.msg));
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;
  }

  sendChatFloating.addEventListener("click", () => {
    const msg = chatInputFloating.value.trim();
    if (!msg || !currentChat) return;
    socket.emit("dm", { to: currentChat, msg });
    appendMessage(currentUser, msg);
    chatInputFloating.value = "";
    if (!chatHistory[currentChat]) chatHistory[currentChat] = [];
    chatHistory[currentChat].push({ sender: currentUser, msg });
  });

  socket.on("dm", ({ from, msg }) => {
    if (!chatHistory[from]) chatHistory[from] = [];
    chatHistory[from].push({ sender: from, msg });
    if (from === currentChat) appendMessage(from, msg);
    showNotification(`💬 Nova mensagem de ${from}`, "blue");
  });

  function appendMessage(sender, msg) {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    chatMessagesFloating.appendChild(div);
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;
  }

});