document.addEventListener("DOMContentLoaded",()=>{

const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");

function drawCanvas(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const gradient=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    const time=Date.now()*0.0002;
    gradient.addColorStop(0,`hsl(${(time*360)%360},50%,10%)`);
    gradient.addColorStop(1,`hsl(${(time*360+180)%360},50%,20%)`);
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    requestAnimationFrame(drawCanvas);
}
drawCanvas();

const socket=io();

// HUD e links
const linksContainer=document.getElementById("linksContainer");
const addLinkBtn=document.getElementById("addLinkBtn");
const linkInput=document.getElementById("linkInput");
let linkQueue=[];

addLinkBtn.addEventListener("click",()=>{
    const url=linkInput.value.trim();
    linkInput.value="";
    if(!url) return;
    if(isValidUrl(url)){
        linkQueue.push(url);
        renderLinks();
        socket.emit("newLink", url);
    }else showNotification("Link inválido!","red");
});

function renderLinks(){
    linksContainer.innerHTML="";
    linkQueue.forEach((url,i)=>{
        const div=document.createElement("div");
        div.className="link-square";
        div.title=url;
        div.textContent=new URL(url).hostname;
        div.onclick=()=>window.open(url,"_blank");
        linksContainer.appendChild(div);
    });
}

function isValidUrl(string){
    try{new URL(string);return true}catch{return false;}
}

socket.on("broadcastLink",url=>{
    if(!linkQueue.includes(url)){
        linkQueue.push(url);
        renderLinks();
    }
});

// Login e registro
const loginBtn=document.getElementById("loginBtn");
const loginModal=document.getElementById("loginModal");
const closeModalBtn=document.getElementById("closeModalBtn");
const registerBtn=document.getElementById("registerBtn");
const loginSubmitBtn=document.getElementById("loginSubmitBtn");
const usernameInput=document.getElementById("username");
const passwordInput=document.getElementById("password");
let currentUser=null,userProfile=null;

loginBtn.addEventListener("click",()=>loginModal.classList.remove("hidden"));
closeModalBtn.addEventListener("click",()=>loginModal.classList.add("hidden"));

registerBtn.addEventListener("click",()=>{
    const user=usernameInput.value.trim();
    const pass=passwordInput.value.trim();
    if(!user||!pass) return showNotification("Preencha todos os campos!","red");
    socket.emit("register",{username:user,password:pass});
});

loginSubmitBtn.addEventListener("click",()=>{
    const user=usernameInput.value.trim();
    const pass=passwordInput.value.trim();
    if(!user||!pass) return showNotification("Preencha todos os campos!","red");
    socket.emit("login",{username:user,password:pass});
});

// Bolinha de perfil
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
    ball.addEventListener("click",()=>{
        menu.classList.toggle("hidden");
    });
}

// Perfil: logout e editar
document.getElementById("logoutBtn").addEventListener("click",()=>{
    currentUser=null;
    userProfile=null;
    document.getElementById("profileBallContainer").innerHTML="";
    document.getElementById("profileMenu").classList.add("hidden");
    loginBtn.style.display="block";
    showNotification("Desconectado!","yellow");
});

// Receber respostas do server
socket.on("registerSuccess",data=>{
    showNotification("Conta criada!","green");
});

socket.on("registerError",msg=>showNotification(msg,"red"));

socket.on("loginSuccess",data=>{
    currentUser=data.username;
    userProfile=data;
    loginModal.classList.add("hidden");
    loginBtn.style.display="none";
    createProfileUI();
    showNotification("Login realizado!","green");
});

socket.on("loginError",msg=>showNotification(msg,"red"));

function showNotification(text,color="yellow"){
    const container=document.getElementById("notificationsContainer");
    const div=document.createElement("div");
    div.className="notification";
    div.style.backgroundColor=color;
    div.textContent=text;
    container.appendChild(div);
    setTimeout(()=>div.remove(),4000);
}
});
