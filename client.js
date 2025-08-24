document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // --- Fundo animado ---
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

  // --- HUD / Links ---
  const linksContainer = document.getElementById("linksContainer");
  const addLinkBtn = document.getElementById("addLinkBtn");
  const linkInput = document.getElementById("linkInput");
  let linkQueue = JSON.parse(localStorage.getItem("links")) || [];

  addLinkBtn.addEventListener("click", () => {
    const url = linkInput.value.trim();
    linkInput.value = "";
    if (!url) return;
    if (isValidUrl(url)) {
      linkQueue.push(url);
      renderLinks();
      localStorage.setItem("links", JSON.stringify(linkQueue));
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
  renderLinks();

  function isValidUrl(string) {
    try { new URL(string); return true; } catch { return false; }
  }

  socket.on("broadcastLink", url => {
    if (!linkQueue.includes(url)) {
      linkQueue.push(url);
      renderLinks();
      localStorage.setItem("links", JSON.stringify(linkQueue));
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

    // Carrega mensagens salvas localmente
    const localMsgs = JSON.parse(localStorage.getItem("messages_" + currentUser)) || [];
    localMsgs.forEach(msg => appendMessage(msg.from, msg.msg));
  });

  socket.on("loginError", msg => showNotification("❌ " + msg, "red"));

  // --- Perfil / Menu ---
  const profileBallContainer = document.getElementById("profileBallContainer");

  function createProfileUI() {
    profileBallContainer.innerHTML = "";
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
    profileBallContainer.appendChild(ball);

    ball.onclick = () => {
      openProfileMenu();
    };
  }

  function openProfileMenu() {
    const menu = document.createElement("div");
    menu.className = "modal-box";
    menu.style.position = "fixed";
    menu.style.top = "80px";
    menu.style.right = "20px";
    menu.style.zIndex = "3000";
    menu.innerHTML = `
      <h3>Menu</h3>
      <button id="menuFriendsBtn">Amigos</button>
      <button id="menuSettingsBtn">Configurações</button>
      <button id="closeProfileMenuBtn">Fechar</button>
    `;
    document.body.appendChild(menu);

    document.getElementById("menuFriendsBtn").onclick = () => {
      document.getElementById("friendsModal").classList.remove("hidden");
    };
    document.getElementById("menuSettingsBtn").onclick = () => {
      document.getElementById("settingsModal").classList.remove("hidden");
    };
    document.getElementById("closeProfileMenuBtn").onclick = () => menu.remove();
  }

  // --- Notificações ---
  const notificationsContainer = document.getElementById("notificationsContainer");

  function showNotification(text, color = "yellow") {
    const div = document.createElement("div");
    div.className = "notification";
    div.style.backgroundColor = color;
    div.innerHTML = `<b>${text}</b>`;
    notificationsContainer.appendChild(div);
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

  socket.on("friendRequestNotification", ({ from, color }) => {
    const notif = document.createElement("div");
    notif.className = "friend-request";
    notif.innerHTML = `
      <span style="background:${color};border-radius:50%;padding:5px;margin-right:5px;">${from[0]}</span>
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
    notificationsContainer.appendChild(notif);
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
  let currentChat = null;

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
    const stored = JSON.parse(localStorage.getItem("messages_" + currentUser)) || [];
    stored.filter(m => m.from === friend || m.from === currentUser).forEach(m => appendMessage(m.from, m.msg));
  }

  sendChatFloating.addEventListener("click", () => {
    const msg = chatInputFloating.value.trim();
    if (!msg || !currentChat) return;
    socket.emit("dm", { to: currentChat, msg });
    appendMessage(currentUser, msg);
    chatInputFloating.value = "";
  });

  socket.on("dm", ({ from, msg }) => {
    appendMessage(from, msg);
    showNotification(`💬 Nova mensagem de ${from}`, "blue");
  });

  function appendMessage(sender, msg) {
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<b>${sender}:</b> ${msg}`;
    chatMessagesFloating.appendChild(div);
    chatMessagesFloating.scrollTop = chatMessagesFloating.scrollHeight;

    // Salva local
    if (!currentUser) return;
    const saved = JSON.parse(localStorage.getItem("messages_" + currentUser)) || [];
    saved.push({ from: sender, msg });
    localStorage.setItem("messages_" + currentUser, JSON.stringify(saved));
  }

  // --- Configurações ---
  const changeNameInput = document.getElementById("changeNameInput");
  const changeNameBtn = document.getElementById("changeNameBtn");
  const changePassInput = document.getElementById("changePassInput");
  const newPassInput = document.getElementById("newPassInput");
  const changePassBtn = document.getElementById("changePassBtn");
  const changeColorInput = document.getElementById("changeColorInput");
  const changeColorBtn = document.getElementById("changeColorBtn");
  const changePhotoInput = document.getElementById("changePhotoInput");
  const changePhotoBtn = document.getElementById("changePhotoBtn");

  changeNameBtn.addEventListener("click", () => {
    const newName = changeNameInput.value.trim();
    if (!newName || !currentUser) return;
    socket.emit("changeName", { oldName: currentUser, newName });
    currentUser = newName;
    userProfile.username = newName;
    createProfileUI();
    showNotification("✅ Nome alterado!", "green");
  });

  changePassBtn.addEventListener("click", () => {
    const pass = changePassInput.value.trim();
    const newPass = newPassInput.value.trim();
    if (!pass || !newPass || !currentUser) return;
    socket.emit("changePassword", { username: currentUser, newPass });
    showNotification("✅ Senha alterada!", "green");
  });

  changeColorBtn.addEventListener("click", () => {
    const color = changeColorInput.value;
    if (!currentUser) return;
    userProfile.color = color;
    createProfileUI();
    socket.emit("changeColor", { username: currentUser, color });
    showNotification("✅ Cor alterada!", "green");
  });

  changePhotoBtn.addEventListener("click", () => {
    const file = changePhotoInput.files[0];
    if (!file || !currentUser) return;
    const reader = new FileReader();
    reader.onload = e => {
      userProfile.photo = e.target.result;
      createProfileUI();
      socket.emit("changePhoto", { username: currentUser, photo: e.target.result });
      showNotification("✅ Foto alterada!", "green");
    };
    reader.readAsDataURL(file);
  });
});
