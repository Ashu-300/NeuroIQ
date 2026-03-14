import logging
import sounddevice as sd
import numpy as np

logger = logging.getLogger(__name__)

# Placeholders and global variables
SOUND_AMPLITUDE = 0
AUDIO_CHEAT = 0

# Sound variables
CALLBACKS_PER_SECOND = 38               # Callbacks per second (system dependent)
SUS_FINDING_FREQUENCY = 2               # Calculates SUS *n* times every second
SOUND_AMPLITUDE_THRESHOLD = 4          # Amplitude considered for SUS calc 

# Packing *n* frames to calculate SUS
FRAMES_COUNT = int(CALLBACKS_PER_SECOND / SUS_FINDING_FREQUENCY)
AMPLITUDE_LIST = [0] * FRAMES_COUNT
SUS_COUNT = 0
count = 0

def calculate_rms(indata):
    """Calculate the Root Mean Square (RMS) value of the audio data."""
    return np.sqrt(np.mean(indata**2)) * 1000  # Scaling factor for better readability

def print_sound(indata, frames, time, status):
    global SOUND_AMPLITUDE, SUS_COUNT, count, SOUND_AMPLITUDE_THRESHOLD, AUDIO_CHEAT

    if status:
        logger.warning(f"Audio status: {status}")

    rms_amplitude = calculate_rms(indata)

    AMPLITUDE_LIST.append(rms_amplitude)
    count += 1
    AMPLITUDE_LIST.pop(0)

    if count == FRAMES_COUNT:

        avg_amp = sum(AMPLITUDE_LIST) / FRAMES_COUNT
        SOUND_AMPLITUDE = avg_amp
        logger.debug(f"Audio amplitude: {round(avg_amp, 2)}")

        if SUS_COUNT >= 1:
            AUDIO_CHEAT = 1
            SUS_COUNT = 0
            logger.warning("Audio cheating detected")

        if avg_amp > SOUND_AMPLITUDE_THRESHOLD:
            SUS_COUNT += 1
        else:
            SUS_COUNT = 0
            AUDIO_CHEAT = 0

        count = 0

def sound(stop_event):

    with sd.InputStream(callback=print_sound):

        while not stop_event.is_set():
            sd.sleep(100)

    logger.info("Audio monitoring stopped")


def sound_analysis():
    global AMPLITUDE_LIST, FRAMES_COUNT, SOUND_AMPLITUDE
    while True:
        AMPLITUDE_LIST.append(SOUND_AMPLITUDE)
        AMPLITUDE_LIST.pop(0)

        avg_amp = sum(AMPLITUDE_LIST) / FRAMES_COUNT

        if avg_amp > 10:
            print("Sus...")

