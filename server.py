from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import json
import hashlib
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # Generate a random secret key for sessions
socketio = SocketIO(app)

ROOM_FOLDER = "rooms"
USERS_FILE = "users.json"

# Load channels from JSON file
with open("channels.json", "r") as f:
    channels = json.load(f)

# Create a mapping from channel name to file for easy lookup
channel_files = {channel["name"].lower(): channel["file"] for channel in channels}

# Load users from JSON file or create empty dict
users = {}
if os.path.exists(USERS_FILE):
    with open(USERS_FILE, "r") as f:
        users = json.load(f)

@app.route("/")
def index():
    return render_template("index.html", channels=channels)

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"})

    if username in users:
        return jsonify({"success": False, "message": "Username already exists"})

    # Hash the password
    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    users[username] = hashed_password

    # Save users to file
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)

    return jsonify({"success": True, "message": "Registration successful"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"})

    hashed_password = hashlib.sha256(password.encode()).hexdigest()
    if users.get(username) == hashed_password:
        session["username"] = username
        return jsonify({"success": True, "message": "Login successful"})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"})

@app.route("/logout")
def logout():
    session.pop("username", None)
    return jsonify({"success": True, "message": "Logged out"})


@socketio.on("join_room")
def handle_join(data):
    username = data["username"]
    room = data["room"]

    join_room(room)

    # Get the corresponding file for this room
    filename = channel_files.get(room.lower())
    if not filename:
        emit("error", {"message": "Invalid room"})
        return

    filepath = os.path.join(ROOM_FOLDER, filename)

    history = []
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            history = f.readlines()

    emit("chat_history", history)

    join_msg = f"--- {username} joined the room ---"

    socketio.emit("receive_message", join_msg, to=room)

    with open(filepath, "a") as f:
        f.write(join_msg + "\n")

@socketio.on("send_message")
def handle_message(data):
    username = data["username"]
    room = data["room"]
    message = data["message"]

    # Get the corresponding file for this room
    filename = channel_files.get(room.lower())
    if not filename:
        emit("error", {"message": "Invalid room"})
        return

    text = f"{username}: {message}"

    filepath = os.path.join(ROOM_FOLDER, filename)

    with open(filepath, "a") as f:
        f.write(text + "\n")

    emit("receive_message", text, to=room)

@socketio.on("leave_room")
def handle_leave(data):
    username = data["username"]
    room = data["room"]

    leave_msg = f"--- {username} left the room ---"

    # Get the corresponding file for this room
    filename = channel_files.get(room.lower())
    if filename:
        filepath = os.path.join(ROOM_FOLDER, filename)
        with open(filepath, "a") as f:
            f.write(leave_msg + "\n")

    socketio.emit("receive_message", leave_msg, to=room)
    leave_room(room)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)