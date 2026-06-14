const socket = io();

let currentRoom = null;
let username = null;
let isMobile = false;

// ---- Message grouping state ----
let lastSender = null;
let lastTimestamp = null;
let _finalizeTimeout = null;
const GROUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes between groups

// ================================================================
// INIT
// ================================================================

fetch("/static/version.json")
  .then(res => res.json())
  .then(data => {
      document.getElementById("version").textContent =
          `v${data.version}`;
  });

detectMobile();
window.addEventListener("resize", detectMobile);

function detectMobile() {
    const wasMobile = isMobile;
    isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    const sidebar = document.getElementById("sidebar");
    const backBtn = document.getElementById("back-btn");
    
    if (isMobile && !wasMobile) {
        // Just switched to mobile
        sidebar.classList.remove("open");
        backBtn.style.display = "flex";
    } else if (!isMobile && wasMobile) {
        // Just switched to desktop
        sidebar.classList.remove("open");
        backBtn.style.display = "none";
    }
}

// ================================================================
// AUTH
// ================================================================

function showRegister() {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("register-section").style.display = "block";
}

function showLogin() {
    document.getElementById("register-section").style.display = "none";
    document.getElementById("auth-section").style.display = "block";
}

async function login() {
    const usernameInput = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!usernameInput || !password) {
        document.getElementById("auth-message").textContent = "Please fill in all fields";
        return;
    }

    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password })
    });

    const result = await response.json();
    document.getElementById("auth-message").textContent = result.message;

    if (result.success) {
        username = usernameInput;
        console.log("Logged in as:", username);
        
        // Update UI
        document.getElementById("sidebar-username").textContent = username;
        document.getElementById("chat-header-name").textContent = "PyTalk";
        document.getElementById("chat-header-status").textContent = "Select a channel";
        
        // Hide auth overlay, show app
        document.getElementById("auth-overlay").classList.add("hidden");
        document.getElementById("app-container").style.display = "flex";
        
        // Clear message state
        resetMessageState();
    }
}

async function register() {
    const regUsername = document.getElementById("register-username").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (!regUsername || !password || !confirmPassword) {
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
        body: JSON.stringify({ username: regUsername, password })
    });

    const result = await response.json();
    document.getElementById("register-message").textContent = result.message;

    if (result.success) {
        showLogin();
        document.getElementById("auth-message").textContent = "Registration successful! Please sign in.";
    }
}

async function logout() {
    await fetch("/logout");
    location.reload();
}

// ================================================================
// SIDEBAR TOGGLE (mobile)
// ================================================================

function toggleSidebar() {
    if (!isMobile) return;
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

// Close sidebar when clicking on a channel (mobile)
function closeSidebarOnMobile() {
    if (isMobile) {
        document.getElementById("sidebar").classList.remove("open");
    }
}

// ================================================================
// CHANNEL / ROOM
// ================================================================

function joinRoom(channel = null) {
    if (!username) {
        alert("Please sign in first");
        return;
    }

    const roomToJoin = channel || currentRoom;

    if (!roomToJoin) {
        alert("Please select a channel first");
        return;
    }
    
    // Show compose bar now that we're joining a channel
    const composeBar = document.getElementById("compose-bar");
    if (composeBar) {
        composeBar.style.display = "flex";
    }
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        sendBtn.disabled = false;
    }

    // Leave previous room
    if (currentRoom && currentRoom !== roomToJoin) {
        socket.emit("leave_room", {
            username: username,
            room: currentRoom
        });
    }

    currentRoom = roomToJoin;
    closeSidebarOnMobile();

    // Update header
    const channelName = roomToJoin.charAt(0).toUpperCase() + roomToJoin.slice(1);
    document.getElementById("chat-header-name").textContent = channelName;
    document.getElementById("chat-header-status").textContent = "Online";
    document.title = "PyTalk - " + channelName;

    // Clear chat and state
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    resetMessageState();

    socket.emit("join_room", {
        username: username,
        room: currentRoom
    });
}

function sendMessage() {

    if (!currentRoom) {
        return;
    }

    const messageInput = document.getElementById("message");
    const message = messageInput.value;

    if (message.trim() === "") {
        messageInput.value = "";
        return;
    }

    socket.emit("send_message", {
        username: username,
        room: currentRoom,
        message: message
    });

    messageInput.value = "";
    messageInput.focus();
}

// ================================================================
// SOCKET EVENTS
// ================================================================

socket.on("receive_message", function(msg) {
    addMessage(msg, true);
});

socket.on("chat_history", function(messages) {
    // Reset state before loading history
    resetMessageState();
    
    // Process messages in order
    messages.forEach(function(msg) {
        const trimmed = msg.trim();
        if (trimmed) {
            addMessage(trimmed, false);
        }
    });
    
    // Cancel any pending debounce then finalize immediately after history load
    clearTimeout(_finalizeTimeout);
    finalizeGroups();
});

// ================================================================
// MESSAGE RENDERING (iMessage-style grouping)
// ================================================================

function resetMessageState() {
    lastSender = null;
    lastTimestamp = null;
}

/**
 * Parse a raw message string like "username: message content"
 * Returns { sender, content, isServer }
 */
function parseMessage(raw) {
    const trimmed = raw.trim();
    
    if (trimmed.startsWith("Server: ")) {
        return { sender: "Server", content: trimmed.substring(8), isServer: true };
    }
    
    const colonIndex = trimmed.indexOf(": ");
    if (colonIndex === -1) {
        return { sender: "Unknown", content: trimmed, isServer: false };
    }
    
    return {
        sender: trimmed.substring(0, colonIndex),
        content: trimmed.substring(colonIndex + 2),
        isServer: false
    };
}

/**
 * Get a readable timestamp label
 */
function getTimestampLabel() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    const m = minutes < 10 ? "0" + minutes : minutes;
    
    return `Today ${h}:${m} ${ampm}`;
}

/**
 * Add a message bubble to the chat with iMessage grouping.
 * Called for both live messages and history loading.
 */
function addMessage(raw, playSound = false) {
    const chat = document.getElementById("chat");
    const parsed = parseMessage(raw);
    
    // Server messages
    if (parsed.isServer) {
        const div = document.createElement("div");
        div.className = "server-message";
        div.textContent = parsed.content;
        chat.appendChild(div);
        lastSender = null;
        return;
    }
    
    const isSent = (username && parsed.sender === username);
    const msgType = isSent ? "sent" : "rcvd";
    const now = Date.now();
    
    // Determine if this message belongs to the same group
    const sameSender = (parsed.sender === lastSender);
    const withinTimeWindow = lastTimestamp && (now - lastTimestamp < GROUP_TIMEOUT_MS);
    const isContinuous = sameSender && withinTimeWindow;
    
    // ---- If new group: add timestamp divider ----
    if (!isContinuous && lastSender !== null) {
        const timestampDiv = document.createElement("div");
        timestampDiv.className = "timestamp-divider";
        timestampDiv.textContent = getTimestampLabel();
        chat.appendChild(timestampDiv);
    }
    
    // ---- If new sender: add sender label ----
    if (!isContinuous && !isSent && parsed.sender !== "Server") {
        const senderLabel = document.createElement("div");
        senderLabel.className = "sender-label rcvd";
        senderLabel.textContent = parsed.sender;
        chat.appendChild(senderLabel);
    }
    
    // ---- Create message bubble (no group classes yet — finalizeGroups handles that) ----
    const div = document.createElement("div");
    div.className = `msg ${msgType}`;
    div.textContent = parsed.content;
    
    // ---- Play sound for incoming messages ----
    if (playSound && !isSent) {
        try {
            const notification = new Audio('static/ping.mp3');
            notification.play().catch(() => {});
        } catch(e) {}
    }
    
    // ---- Append and scroll ----
    chat.appendChild(div);
    
    // Scroll to bottom
    const container = document.getElementById("messages-container");
    container.scrollTop = container.scrollHeight;
    
    // Update state
    lastSender = parsed.sender;
    lastTimestamp = now;
    
    // Debounce finalizeGroups for live messages (single source of truth for grouping)
    clearTimeout(_finalizeTimeout);
    _finalizeTimeout = setTimeout(finalizeGroups, 50);
}

/**
 * Finalize message groups — assigns top/middle/bottom classes.
 * Lone messages fall back to the base fully-rounded style (no extra class).
 * Respects timestamp dividers and sender labels as group boundaries.
 */
function finalizeGroups() {
    const chat = document.getElementById("chat");
    const bubbles = chat.querySelectorAll(".msg.sent, .msg.rcvd");
    
    if (bubbles.length === 0) return;
    
    let i = 0;
    while (i < bubbles.length) {
        const msgType = bubbles[i].classList.contains("sent") ? "sent" : "rcvd";
        let j = i + 1;
        
        // Find end of this group — stop if type changes OR a non-bubble
        // element (timestamp, sender label) sits between consecutive bubbles
        while (j < bubbles.length && bubbles[j].classList.contains(msgType)) {
            if (hasInterveningElement(bubbles[j - 1], bubbles[j])) {
                break;
            }
            j++;
        }
        
        const groupSize = j - i;
        
        if (groupSize === 1) {
            // Lone message — base style is already fully rounded, just remove group classes
            bubbles[i].classList.remove("top", "middle");
        } else {
            // Group of 2+
            for (let k = i; k < j; k++) {
                bubbles[k].classList.remove("top", "middle");
            }
            
            bubbles[i].classList.add("top");
            
            for (let k = i + 1; k < j - 1; k++) {
                bubbles[k].classList.add("middle");
            }
            
            bubbles[j - 1].classList.add("bottom");
        }
        
        i = j;
    }
}

/**
 * Returns true if a non-msg element sits between two consecutive
 * bubble elements in the DOM (e.g. a timestamp divider).
 */
function hasInterveningElement(prev, next) {
    let el = prev.nextElementSibling;
    while (el && el !== next) {
        if (!el.classList.contains("msg")) {
            return true;
        }
        el = el.nextElementSibling;
    }
    return false;
}

// ================================================================
// SETTINGS
// ================================================================

function changeColor(color) {
    document.documentElement.style.setProperty(
        "--bubble-sent",
        color
    );
    
    // Update active swatch indicator in one pass
    const normalized = normalizeColor(color);
    document.querySelectorAll(".color-swatch").forEach(swatch => {
        swatch.classList.remove("active");
        const bg = swatch.style.backgroundColor || swatch.style.background;
        if (bg && normalizeColor(bg) === normalized) {
            swatch.classList.add("active");
        }
    });
}

function normalizeColor(c) {
    // Simple lowercase trim comparison
    return c.replace(/\s/g, "").toLowerCase();
}

function openSettings() {
    document.getElementById("settingsModal").classList.add("open");
}

function closeSettings() {
    document.getElementById("settingsModal").classList.remove("open");
}

// Close modal on backdrop click
document.getElementById("settingsModal").addEventListener("click", function(e) {
    if (e.target.id === "settingsModal") {
        closeSettings();
    }
});

// ================================================================
// KEYBOARD
// ================================================================

document.getElementById("message").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

// ================================================================
// CHANNEL SELECTION
// ================================================================

document.addEventListener("DOMContentLoaded", function() {
    // Set default blue swatch as active
    const blueSwatch = document.querySelector(".color-swatch");
    if (blueSwatch) blueSwatch.classList.add("active");
    
    const channelItems = document.querySelectorAll(".channel-item");
    
    channelItems.forEach(item => {
        item.addEventListener("click", function() {
            // Remove active from all
            channelItems.forEach(i => i.classList.remove("active"));
            
            // Add active
            this.classList.add("active");
            
            // Join channel
            const selectedChannel = this.dataset.room;
            joinRoom(selectedChannel);
        });
    });
});
