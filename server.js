const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const fs=require("fs-extra");
const path=require("path");

const app=express();
const server=http.createServer(app);
const io=new Server(server);

const PORT=3000;
const DATA_FILE=path.join(__dirname,"users.json");

app.use(express.static(__dirname));
app.use(express.json());

let users={};
let sockets={};
let links=[];

if(fs.existsSync(DATA_FILE)) users=fs.readJsonSync(DATA_FILE);

function saveUsers(){
    fs.writeJsonSync(DATA_FILE,users,{spaces:2});
}

function generateID(){
    return "ID"+Math.floor(Math.random()*1000000);
}

// Socket.IO
io.on("connection",socket=>{
    console.log("Novo jogador conectado:",socket.id);

    socket.on("register",({username,password})=>{
        if(users[username]) return socket.emit("registerError","Usuário já existe!");
        const id=generateID();
        users[username]={id,username,password,color:"#3498db",photo:null,editedName:false,friends:[],requests:[]};
        saveUsers();
        socket.emit("registerSuccess",users[username]);
    });

    socket.on("login",({username,password})=>{
        if(!users[username] || users[username].password!==password) return socket.emit("loginError","Usuário ou senha incorretos!");
        socket.username=username;
        sockets[username]=socket.id;
        socket.emit("loginSuccess",users[username]);
    });

    socket.on("newLink",url=>{
        links.push(url);
        socket.broadcast.emit("broadcastLink",url);
    });

    socket.on("friendRequest",({from,to})=>{
        if(users[to] && !users[to].requests.includes(from) && !users[to].friends.includes(from)){
            users[to].requests.push(from);
            saveUsers();
            if(sockets[to]) io.to(sockets[to]).emit("friendRequest",{from,to});
        }
    });

    socket.on("acceptRequest",({from,to})=>{
        if(users[to]){
            users[to].friends.push(from);
            users[to].requests=users[to].requests.filter(r=>r!==from);
            saveUsers();
            if(sockets[to]) io.to(sockets[to]).emit("acceptRequest",{from,to});
        }
    });

    socket.on("disconnect",()=>{
        if(socket.username) delete sockets[socket.username];
        console.log("Desconectado:",socket.id);
    });
});

server.listen(PORT,()=>console.log(`Servidor rodando na porta ${PORT}`));
