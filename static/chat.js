const socket = io();

let currentRoom = null;
let username = null;

function joinRoom() {

    username = document.getElementById("username").value;
    currentRoom = document.getElementById("room").value;

    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    socket.emit("join_room", {
        username: username,
        room: currentRoom
    });
}

function sendMessage() {

    if (!currentRoom) {
        alert("Join a room first");
        return;
    }

    const messageInput = document.getElementById("message");
    const message = messageInput.value;

    socket.emit("send_message", {
        username: username,
        room: currentRoom,
        message: message
    });

    messageInput.value = "";
}

socket.on("receive_message", function(msg) {

    const chat = document.getElementById("chat");

    chat.innerHTML += msg + "<br>";
    chat.scrollTop = chat.scrollHeight;

});

socket.on("chat_history", function(messages) {

    const chat = document.getElementById("chat");

    messages.forEach(function(msg){
        chat.innerHTML += msg + "<br>";
    });

});