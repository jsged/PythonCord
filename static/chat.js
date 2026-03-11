const socket = io();

let currentRoom = null;
let username = null;

function showRegister() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("register-section").style.display = "block";
}

function showLogin() {
    document.getElementById("register-section").style.display = "none";
    document.getElementById("auth-section").style.display = "block";
}

async function login() {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
        document.getElementById("auth-message").textContent = "Please fill in all fields";
        return;
    }

    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById("auth-message").textContent = result.message;

    if (result.success) {
        this.username = username;
        document.getElementById("current-user").textContent = username;
        document.getElementById("auth-section").style.display = "none";
        document.getElementById("chat-section").style.display = "block";
    }
}

async function register() {
    const username = document.getElementById("register-username").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (!username || !password || !confirmPassword) {
        document.getElementById("register-message").textContent = "Please fill in all fields";
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById("register-message").textContent = "Passwords do not match";
        return;
    }

    const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    document.getElementById("register-message").textContent = result.message;

    if (result.success) {
        showLogin();
        document.getElementById("auth-message").textContent = "Registration successful! Please login.";
    }
}

async function logout() {
    await fetch("/logout");
    location.reload();
}

function joinRoom(channel = null) {

    if (!username) {
        alert("Please login first");
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