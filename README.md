# PythonCord

A lightweight LAN chat application built with Flask and WebSockets, inspired by Discord's interface and functionality.

## Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections
- **Multiple Channels**: Organized chat across different rooms (General, Gaming, Tech, etc.)
- **User Authentication**: Secure user registration and login with password hashing
- **Web-Based Interface**: Clean, responsive UI accessible from any browser
- **LAN-Based**: Designed for local network communication

## Tech Stack

- **Backend**: Python Flask with Flask-SocketIO
- **Frontend**: HTML, CSS, JavaScript
- **Data Storage**: JSON files for users and channels
- **Real-time Communication**: WebSocket

## Project Structure

```
PythonCord/
├── server.py              # Main Flask application
├── requirements.txt       # Python dependencies
├── channels.json          # Channel configuration
├── users.json             # Registered users and passwords
├── rooms/                 # Channel message storage
│   ├── general.txt
│   ├── gaming.txt
│   └── tech.txt
├── templates/
│   └── index.html         # Main chat interface
└── static/
    ├── styles.css         # UI styling
    ├── chat.js            # Client-side logic
    └── images/            # Static images
        └── psd/           # Design files
```

## Installation

1. Clone or download this repository:
   ```bash
   cd PythonCord
   ```

2. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Start the server:
   ```bash
   python server.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Register a new account or login with existing credentials

4. Select a channel from the sidebar to start chatting

## Requirements

- Python 3.7+
- Flask
- Flask-SocketIO

See `requirements.txt` for specific versions.

## How It Works

- **Server** (`server.py`): Handles user authentication, channel management, and WebSocket connections
- **Frontend** (`index.html`): Provides the user interface for login, channel selection, and messaging
- **Storage**: User credentials and messages are stored in JSON files for simplicity

## Notes

- This is a LAN-based application intended for local network use
- Passwords are hashed using SHA-256
- Messages are persisted in room-specific text files
