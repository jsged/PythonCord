const socket = io();

let currentRoom = null;
let username = null;

function joinRoom(channel = null) {

    username = document.getElementById("username").value;

    if (!username) {
        alert("Your username cannot be blank");
        return;
    }

    // If a channel is provided, use it; otherwise use currentRoom
    const roomToJoin = channel || currentRoom;

    if (!roomToJoin) {
        alert("Please select a channel first");
        return;
    }

    // If switching channels, leave the current room first
    if (currentRoom && currentRoom !== roomToJoin) {
        socket.emit("leave_room", {
            username: username,
            room: currentRoom
        });
    }

    currentRoom = roomToJoin;

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

    addMessage(msg);

});

socket.on("chat_history", function(messages) {

    messages.forEach(function(msg){
        addMessage(msg.trim());
    });

});

function addMessage(msg) {
    const chat = document.getElementById("chat");
    
    const messageDiv = document.createElement("div");
    messageDiv.textContent = msg;
    
    // Check if this is a message from the current user
    if (username && msg.startsWith(username + ": ")) {
        messageDiv.className = "message user-message";
    } else {
        messageDiv.className = "self-message";
    }
    
    chat.appendChild(messageDiv);
    chat.scrollTop = chat.scrollHeight;
}

// Channel selection functionality
document.addEventListener('DOMContentLoaded', function() {
    const channelItems = document.querySelectorAll('.channel-item');
    
    channelItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            channelItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Automatically join the selected channel
            const selectedChannel = this.dataset.room;
            joinRoom(selectedChannel);
        });
    });
});