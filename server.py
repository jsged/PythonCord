from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import json

app = Flask(__name__)
socketio = SocketIO(app)

ROOM_FOLDER = "rooms"

# Load channels from JSON file
with open("channels.json", "r") as f:
    channels = json.load(f)

# Create a mapping from channel name to file for easy lookup
channel_files = {channel["name"].lower(): channel["file"] for channel in channels}

@app.route("/")
def index():
    return render_template("index.html", channels=channels)


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