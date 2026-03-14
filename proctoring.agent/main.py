import os
import sys
from dotenv import load_dotenv

# Load ENV FIRST
if getattr(sys, "frozen", False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(__file__)

env_path = os.path.join(base_dir, ".env")

print("Loading ENV from:", env_path)

load_dotenv(env_path, override=True)

print("ENV SOCKET:", os.getenv("PROCTOR_BACKEND_SOCKETIO"))

# NOW import the rest
import threading
import uvicorn
from app import app
import pystray
from PIL import Image


def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)



def run_server():
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9000,
        log_config=None
    )


def quit_app(icon, item):
    icon.stop()
    sys.exit()


def create_tray():
    image = Image.open(resource_path("icon.ico"))

    menu = pystray.Menu(
        pystray.MenuItem("Exit", quit_app)
    )

    icon = pystray.Icon(
        "NeuroIQ Agent",
        image,
        "NeuroIQ Proctor Agent",
        menu
    )

    icon.run()


if __name__ == "__main__":
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    create_tray()