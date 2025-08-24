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
  let currentChat = null;
  let messagesCache = {}; // Armazena mensagens por usuário

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
    linkQueue = data.links || [];
    messagesCache = data.messages || {};
    loginModal.classList.add("hidden");
    loginBtn.style.display = "none";
    createProfileUI();
    updateFriendsUI();
    showNotification("🎉 Login realizado!", "green");
    document.getElementById("chatFloating").classList.remove("hidden");
    renderLinks();
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
      img.className = "profile-img";
      ball.appendChild(img);
    } else {
      ball.textContent = userProfile.username[0].toUpperCase();
      ball.style.backgroundColor = userProfile.color;
    }
    profileContainer.appendChild(ball);
    ball.onclick = () => {
      document.getElementById("friendsModal").classList.remove("hidden");
      updateFriendsUI();
    };
  }

  // --- Notificações ---
  const notificationsList = document.getElementById("notificationsList");
  function showNotification(text, color = "yellow") {
    const container = document.getElementById("notificationsContainer");
    const div = document.createElement("div");
    div.className = "notification";
    div.style.backgroundColor = color;
    div.innerHTML = `<b>${text}</b>`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  // --- Amigos ---
  const friendsList = document.getElementById("friendsList");
  const requestsList = document.getElementById("requestsList");
  const friendInput = document.getElementById("friendInput");
  const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");

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
    const notif = document.createElement("div");
    notif.className = "friend-request";
    notif.innerHTML = `
      ${photo ? `<img src="${photo}" class="profile-img-small">` 
              : `<span class="profile-ball-small" style="background:${color}">${from[0].toUpperCase()}</span>`}
      <span><b>${from}</b> quer ser seu amigo</span>
    `;
    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Aceitar";
    acceptBtn.onclick = () => {
      socket.emit("acceptRequest", { from, to: currentUser });
      notif.remove();
      updateFriendsUI();
    };
    const rejectBtn = document.createElement("button");
    rejectBtn.textContent = "Recusar";
    rejectBtn.onclick = () => {
      socket.emit("rejectRequest", { from, to: currentUser });
      notif.remove();
    };
    notif.appendChild(acceptBtn);
    notif.appendChild(rejectBtn);
    notificationsList.appendChild(notif);
  });

  socket.on("friendAccepted", ({ from }) => {
    showNotification(`🤝 Você e ${from} agora são amigos!`, "green");
    if (!userProfile.friends.includes(from)) userProfile.friends.push(from);
    updateFriendsUI();
    renderChatFriends();
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

  // --- Chat flutuante ---
  const chatFriendsContainer = document.getElementById("chatFriends");
  const chatMessagesFloating = document.getElementById("chatMessagesFloating");
  const chatInputFloating = document.getElementById("chatInputFloating");
  const sendChatFloating = document.getElementById("sendChatFloating");

  function renderChatFriends() {
    chatFriendsContainer.innerHTML = "";
    userProfile.friends.forEach(f => {
      const btn = document.createElement("button");
      btn.className = "chat-friend-btn";
      btn.textContent = f;
      btn.onclick = () => openChat(f);
      chatFriendsContainer.appendChild(btn);
    });
  }

  function openChat(friend) {
    currentChat = friend;
    chatMessagesFloating.innerHTML = `<div class="chat-header">Chat com ${friend}</div>`;
    if (messagesCache[friend]) {
      messagesCache[friend].forEach(msg => appendMessage(msg.sender, msg.text));
    }
  }

  sendChatFloating.addEventListener("click", () => {
    const msg = chatInputFloating.value.trim();
    if (!msg || !currentChat) return;
    socket.emit("dm", { to: currentChat, msg });
    appendMessage(currentUser, msg);
    chatInputFloating.value = "";
    if (!messagesCache[currentChat]) messagesCache[currentChat] = [];
    messagesCache[currentChat].push({ sender: currentUser, text: msg });
  });

  socket.on("dm", ({ from, msg }) => {
    if (!messagesCache[from]) messagesCache[from] = [];
    messagesCache[from].push({ sender: from, text: msg });
    if (from === currentChat) appendMessage(from, msg);
    else showNotification(`💬 Nova mensagem de ${from}`, "#f39c12");
  });

  function appendMessage(sender, msg) {
    const div = document.createElement("div");
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    chatMessagesFloating.appendChild(div);
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;
  }

  // --- Configurações ---
  const changeNameBtn = document.getElementById("changeNameBtn");
  const changeNameInput = document.getElementById("changeNameInput");
  const changePassBtn = document.getElementById("changePassBtn");
  const changePassInput = document.getElementById("changePassInput");
  const newPassInput = document.getElementById("newPassInput");
  const changeColorBtn = document.getElementById("changeColorBtn");
  const changeColorInput = document.getElementById("changeColorInput");
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const changePhotoInput = document.getElementById("changePhotoInput");

  changeNameBtn.addEventListener("click", () => {
    const newName = changeNameInput.value.trim();
    if (!newName) return;
    socket.emit("changeName", { oldName: currentUser, newName });
    currentUser = newName;
    showNotification("✅ Nome alterado!", "green");
  });

  changePassBtn.addEventListener("click", () => {
    const oldPass = changePassInput.value.trim();
    const newPass = newPassInput.value.trim();
    if (!oldPass || !newPass) return;
    socket.emit("changePassword", { username: currentUser, newPass });
    showNotification("✅ Senha alterada!", "green");
  });

  changeColorBtn.addEventListener("click", () => {
    const color = changeColorInput.value;
    socket.emit("changeColor", { username: currentUser, color });
    userProfile.color = color;
    createProfileUI();
  });

  changePhotoBtn.addEventListener("click", () => {
    const file = changePhotoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("changePhoto", { username: currentUser, photo: reader.result });
      userProfile.photo = reader.result;
      createProfileUI();
    };
    reader.readAsDataURL(file);
  });
});
