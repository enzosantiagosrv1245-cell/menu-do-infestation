document.addEventListener("DOMContentLoaded", () => {

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Fundo animado
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    const time = Date.now() * 0.0002;
    gradient.addColorStop(0, `hsl(${(time*360)%360},50%,10%)`);
    gradient.addColorStop(1, `hsl(${(time*360+180)%360},50%,20%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    requestAnimationFrame(drawCanvas);
}
drawCanvas();

const socket = io();

// Links
const linksContainer = document.getElementById("linksContainer");
const addLinkBtn = document.getElementById("addLinkBtn");
const linkInput = document.getElementById("linkInput");
let linkQueue = [];

addLinkBtn.addEventListener("click",()=>{
    const url = linkInput.value.trim();
    linkInput.value="";
    if(!url) return;
    if(isValidUrl(url)){
        linkQueue.push(url);
        renderLinks();
        socket.emit("newLink", url);
    } else showNotification("Link inválido!","red");
});

function renderLinks() {
    linksContainer.innerHTML="";
    linkQueue.forEach(url=>{
        const div = document.createElement("div");
        div.className="link-square";
        div.title=url;
        div.textContent = new URL(url).hostname;
        div.onclick = ()=>window.open(url,"_blank");
        linksContainer.appendChild(div);
    });
}

function isValidUrl(string){
    try{new URL(string); return true} catch{return false;}
}

socket.on("broadcastLink", url=>{
    if(!linkQueue.includes(url)){
        linkQueue.push(url);
        renderLinks();
    }
});

// Login
const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const registerBtn = document.getElementById("registerBtn");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

let currentUser=null;
let userProfile=null;

// HUD de amigos
const friendsList = document.getElementById("friendsList");
const requestsList = document.getElementById("requestsList");

loginBtn.addEventListener("click",()=>loginModal.classList.remove("hidden"));
closeModalBtn.addEventListener("click",()=>loginModal.classList.add("hidden"));

registerBtn.addEventListener("click",()=>{
    const user=usernameInput.value.trim();
    const pass=passwordInput.value.trim();
    if(!user || !pass) return showNotification("Preencha todos os campos!","red");
    socket.emit("register",{username:user,password:pass});
});

loginSubmitBtn.addEventListener("click",()=>{
    const user=usernameInput.value.trim();
    const pass=passwordInput.value.trim();
    if(!user || !pass) return showNotification("Preencha todos os campos!","red");
    socket.emit("login",{username:user,password:pass});
});

// Perfil
function createProfileUI(){
    if(!currentUser) return;
    const container=document.getElementById("profileBallContainer");
    container.innerHTML="";
    const ball=document.createElement("div");
    ball.className="profile-ball";
    ball.textContent=userProfile.username[0].toUpperCase();
    ball.style.backgroundColor=userProfile.color;
    container.appendChild(ball);

    const menu=document.getElementById("profileMenu");
    ball.addEventListener("click",()=>menu.classList.toggle("hidden"));

    document.getElementById("logoutBtn").onclick=()=>{
        currentUser=null;
        userProfile=null;
        container.innerHTML="";
        menu.classList.add("hidden");
        loginBtn.style.display="block";
        showNotification("Desconectado!","yellow");
        friendsList.innerHTML="";
        requestsList.innerHTML="";
    };

    document.getElementById("editProfileBtn").onclick=()=>{
        showNotification("Função de editar perfil ainda não implementada","yellow");
    };
}

// Amigos
function updateFriendsUI(){
    friendsList.innerHTML="";
    userProfile.friends.forEach(f=>{
        const li=document.createElement("li");
        li.textContent=f;
        friendsList.appendChild(li);
    });

    requestsList.innerHTML="";
    userProfile.requests.forEach(r=>{
        const li=document.createElement("li");
        li.textContent=r;
        li.onclick=()=>{
            socket.emit("acceptRequest",{from:r,to:currentUser});
            showNotification(`Você aceitou ${r}`,"green");
        };
        requestsList.appendChild(li);
    });
}

function sendFriendRequest(toUser){
    if(!currentUser) return;
    socket.emit("friendRequest",{from:currentUser,to:toUser});
}

// Notificações
function showNotification(text,color="yellow"){
    const container=document.getElementById("notificationsContainer");
    const div=document.createElement("div");
    div.className="notification";
    div.style.backgroundColor=color;
    div.textContent=text;
    container.appendChild(div);
    setTimeout(()=>div.remove(),4000);
}

// Socket events
socket.on("registerSuccess", data=>showNotification("Conta criada!","green"));
socket.on("registerError", msg=>showNotification(msg,"red"));
socket.on("loginSuccess", data=>{
    currentUser=data.username;
    userProfile=data;
    loginModal.classList.add("hidden");
    loginBtn.style.display="none";
    createProfileUI();
    updateFriendsUI();
    showNotification("Login realizado!","green");
});
socket.on("loginError", msg=>showNotification(msg,"red"));

socket.on("friendRequest",({from,to})=>{
    if(to===currentUser){
        userProfile.requests.push(from);
        updateFriendsUI();
        showNotification(`Você recebeu um pedido de amizade de ${from}`,"blue");
    }
});

socket.on("acceptRequest",({from,to})=>{
    if(to===currentUser){
        userProfile.friends.push(from);
        userProfile.requests=userProfile.requests.filter(r=>r!==from);
        updateFriendsUI();
        showNotification(`${from} é agora seu amigo!`,"green");
    }
});

socket.on("broadcastLink",url=>{
    if(!linkQueue.includes(url)){
        linkQueue.push(url);
        renderLinks();
    }
});

});
