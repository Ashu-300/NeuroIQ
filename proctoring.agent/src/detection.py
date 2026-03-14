import matplotlib
matplotlib.use("Agg")
import time
import logging
from datetime import datetime, timezone

from src import audio
from src import head_pose
from src import socketio_client
from src.session import get_session
import matplotlib.pyplot as plt
import numpy as np

logger = logging.getLogger(__name__)

PLOT_LENGTH = 200

# place holders 
GLOBAL_CHEAT = 0
PERCENTAGE_CHEAT = 0
CHEAT_THRESH = 0.6
XDATA = list(range(200))
YDATA = [0]*200

# Track last Socket.IO send time
_last_send_time = 0
SEND_INTERVAL = 1.0  # Send data every 1 second

def avg(current, previous):
    if previous > 1:
        return 0.65
    if current == 0:
        if previous < 0.01:
            return 0.01
        return previous / 1.01
    if previous == 0:
        return current
    return 1 * previous + 0.1 * current

def process():
    global GLOBAL_CHEAT, PERCENTAGE_CHEAT, CHEAT_THRESH #head_pose.X_AXIS_CHEAT, head_pose.Y_AXIS_CHEAT, audio.AUDIO_CHEAT
    # print(head_pose.X_AXIS_CHEAT, head_pose.Y_AXIS_CHEAT)
    # print("entered proess()...")
    if GLOBAL_CHEAT == 0:
        if head_pose.X_AXIS_CHEAT == 0:
            if head_pose.Y_AXIS_CHEAT == 0:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.2, PERCENTAGE_CHEAT)
            else:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.2, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.4, PERCENTAGE_CHEAT)
        else:
            if head_pose.Y_AXIS_CHEAT == 0:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.1, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.4, PERCENTAGE_CHEAT)
            else:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.15, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.25, PERCENTAGE_CHEAT)
    else:
        if head_pose.X_AXIS_CHEAT == 0:
            if head_pose.Y_AXIS_CHEAT == 0:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.55, PERCENTAGE_CHEAT)
            else:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.55, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.85, PERCENTAGE_CHEAT)
        else:
            if head_pose.Y_AXIS_CHEAT == 0:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.6, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.85, PERCENTAGE_CHEAT)
            else:
                if audio.AUDIO_CHEAT == 0:
                    PERCENTAGE_CHEAT = avg(0.5, PERCENTAGE_CHEAT)
                else:
                    PERCENTAGE_CHEAT = avg(0.85, PERCENTAGE_CHEAT)

    if PERCENTAGE_CHEAT > CHEAT_THRESH:
        GLOBAL_CHEAT = 1
        logger.debug("Cheating threshold exceeded")
    else:
        GLOBAL_CHEAT = 0
    logger.debug(f"Cheat percent: {PERCENTAGE_CHEAT}, Global cheat: {GLOBAL_CHEAT}")


def send_proctoring_data():
    """Send proctoring data to backend via Socket.IO."""
    global _last_send_time

    current_time = time.time()
    
    # Only send data once per second
    if current_time - _last_send_time < SEND_INTERVAL:
        return
    
    _last_send_time = current_time
    
    session = get_session()
    if not session:
        logger.warning("No session info available - skipping data send")
        return
    
    # Build payload with all proctoring data
    payload = {
        "session_id": session.session_id,
        "student_id": session.student_id,
        "exam_id": session.exam_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cheating_probability": round(PERCENTAGE_CHEAT, 4),
        "cheating_detected": GLOBAL_CHEAT == 1,
        "looking_direction": _get_looking_direction(),
        "face_detected": True,  # If we reach here, face is detected via head_pose
        "audio_suspicious": audio.AUDIO_CHEAT == 1,
        "x_axis_cheat": head_pose.X_AXIS_CHEAT == 1,
        "y_axis_cheat": head_pose.Y_AXIS_CHEAT == 1
    }
    
    success = socketio_client.send_proctor_data(payload)
    if success:
        logger.info(f"Proctoring data sent: probability={payload['cheating_probability']}")
    else:
        logger.warning("Failed to send proctoring data")


def _get_looking_direction() -> str:
    """Determine the direction the user is looking based on head pose."""
    x = head_pose.x
    y = head_pose.y
    
    if y < -10:
        return "left"
    elif y > 10:
        return "right"
    elif x < -10:
        return "down"
    else:
        return "forward"

def run_detection(stop_event):

    global XDATA, YDATA

    plt.ion()   # interactive mode

    fig, ax = plt.subplots()

    ax.set_xlim(0, 200)
    ax.set_ylim(0, 1)

    line, = ax.plot(XDATA, YDATA, 'r-')

    plt.title("Suspicious Behaviour Detection")
    plt.xlabel("Time")
    plt.ylabel("Cheat Probability")

    plt.show(block=False)

    while not stop_event.is_set():

        process()   # compute new cheat value
        send_proctoring_data()  # send data via Socket.IO

        YDATA.pop(0)
        YDATA.append(PERCENTAGE_CHEAT)

        line.set_xdata(XDATA)
        line.set_ydata(YDATA)

        fig.canvas.draw()
        fig.canvas.flush_events()

        time.sleep(0.2)

    plt.close(fig)

    logger.info("Detection stopped")

