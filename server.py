from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
import os

app = Flask(__name__)
socketio = SocketIO(app)

ROOM_FOLDER = "rooms"
rooms = ["general", "gaming", "tech"]

@app.route("/")
def index():
    return render_template("index.html", rooms=rooms)


@socketio.on("join_room")
def handle_join(data):
    username = data["username"]
    room = data["room"]

    join_room(room)

    filepath = os.path.join(ROOM_FOLDER, f"{room}.txt")

    history = []
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            history = f.readlines()

    emit("chat_history", history)


@socketio.on("send_message")
def handle_message(data):
    username = data["username"]
    room = data["room"]
    message = data["message"]

    text = f"{username}: {message}"

    filepath = os.path.join(ROOM_FOLDER, f"{room}.txt")

    with open(filepath, "a") as f:
        f.write(text + "\n")

    emit("receive_message", text, to=room)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)