import logging
import threading as th

from src import audio, head_pose, detection

logger = logging.getLogger(__name__)

stop_event = th.Event()

threads = []
threads_lock = th.Lock()

def start_proctoring():
    global threads
    with threads_lock:
        # Do not start duplicate worker sets.
        if any(t.is_alive() for t in threads):
            logger.info("Proctoring threads already running")
            return

        stop_event.clear()

        logger.info("Starting proctoring threads...")

        head_pose_thread = th.Thread(target=head_pose.pose, args=(stop_event,), daemon=True)
        audio_thread = th.Thread(target=audio.sound, args=(stop_event,), daemon=True)
        detection_thread = th.Thread(target=detection.run_detection, args=(stop_event,), daemon=True)

        threads = [head_pose_thread, audio_thread, detection_thread]

        for t in threads:
            t.start()

        logger.info("All proctoring threads started")


def stop_proctoring():
    global threads
    logger.info("Stopping proctoring threads...")
    stop_event.set()
    with threads_lock:
        for t in threads:
            if t.is_alive():
                t.join(timeout=2)
        threads = []
    logger.info("Proctoring stop signal sent")


def is_proctoring_active():
    with threads_lock:
        return any(t.is_alive() for t in threads)