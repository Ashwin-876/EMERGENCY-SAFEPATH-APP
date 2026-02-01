import './style.css'
import AgoraRTC from "agora-rtc-sdk-ng";

// --- CONFIGURATION ---
// --- CONFIGURATION ---
// Use VITE_ prefix for environment variables
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || "09470838be104240bcaede1829fd7815";
const CHANNEL = import.meta.env.VITE_AGORA_CHANNEL || "emergency-channel";
const TOKEN = import.meta.env.VITE_AGORA_TOKEN || null;

// --- STATE ---
let client;
let localAudioTrack;
let remoteUser; // Store reference to the user calling
let alarmAudio; // Audio Object

// Base64 Alarm Sound (Short Beep/Siren Loop)
// This is a simple generated sine wave pattern converted to base64 mp3/wav to avoid external assets.
const ALARM_SOURCE = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Truncated placeholder - I will use a real simple beeping data URI.

// Actually, generating a simple oscillator beeping with Web Audio API is cleaner and robust.
let audioCtx;
let oscillator;
let gainNode;

// --- DOM ELEMENTS ---
const appDiv = document.getElementById("app");
const enableBtn = document.getElementById("enable-btn");
const setupPanel = document.getElementById("setup-panel");
const monitoringPanel = document.getElementById("monitoring-panel");
const monitorStatus = document.getElementById("monitor-status");
const incomingAlert = document.getElementById("incoming-alert");
const activeCall = document.getElementById("active-call");
const acceptBtn = document.getElementById("accept-btn");
const rejectBtn = document.getElementById("reject-btn");
const hangupBtn = document.getElementById("hangup-btn");

// --- DOM ELEMENTS ---
const unlockOverlay = document.getElementById("audio-unlock-overlay");

// Custom click handler for overlay
if (unlockOverlay) {
  unlockOverlay.addEventListener('click', () => {
    initAudioContext();
    if (audioCtx && audioCtx.resume) audioCtx.resume();
    unlockOverlay.style.display = 'none';
  });
}

// --- INITIALIZATION ---
function initialize() {
  if (enableBtn) enableBtn.onclick = startMonitoring;
  acceptBtn.onclick = acceptCall;
  rejectBtn.onclick = rejectCall;
  hangupBtn.onclick = endCall;

  // AUTO START MONITORING
  startMonitoring();

  // Global listener to unlock AudioContext on first interaction
  document.addEventListener('click', () => {
    initAudioContext();
  }, { once: true });
}

// --- ALARM LOGIC ---
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playAlarm() {
  initAudioContext();
  if (oscillator) return; // Already playing

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();

  const now = audioCtx.currentTime;
  gainNode.gain.value = 0.5;

  let isHigh = true;
  oscillator.frequency.value = 800;

  window.alarmInterval = setInterval(() => {
    if (oscillator) {
      oscillator.frequency.cancelScheduledValues(audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(isHigh ? 600 : 900, audioCtx.currentTime);
      isHigh = !isHigh;
    }
  }, 400); // 400ms switch
}

function stopAlarm() {
  if (window.alarmInterval) {
    clearInterval(window.alarmInterval);
    window.alarmInterval = null;
  }
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch (e) { }
    oscillator = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

// --- LOGIC ---
async function startMonitoring() {
  // Try to Init Audio (might be blocked until click)
  try { initAudioContext(); } catch (e) { }

  // 1. Request Notification Permission (might be blocked until click)
  if ("Notification" in window) {
    if (Notification.permission !== 'granted') {
      // We can't force request without gesture, so we wait or try
      // Just try silent request or rely on previous permission
      try {
        Notification.requestPermission();
      } catch (e) { }
    }
  }

  // 2. Initialize Agora Client
  if (!client) {
    client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // 3. Setup Listeners
    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);
  }

  try {
    // 4. Join Channel Silently (Monitoring Mode)
    await client.join(APP_ID, CHANNEL, TOKEN, null);
    console.log("Monitoring started - Joined channel silently");

    // UI is already set to Monitoring (Always Online)
    if (monitorStatus) {
      monitorStatus.querySelector(".status-text").textContent = "Online & Monitoring";
      monitorStatus.classList.add("online");
    }

  } catch (error) {
    console.error("Failed to join:", error);
    // Silent fail or retry? Keep trying?
  }
}

async function handleUserPublished(user, mediaType) {
  console.log("User published:", user.uid);
  if (mediaType === "audio") {
    remoteUser = user;

    // PLAY ALARM
    playAlarm();

    // TRIGGER NOTIFICATION
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("EMERGENCY ALERT", {
        body: "User needs help now! Click to respond.",
        icon: "/vite.svg" // Optional
      });
    }

    // Show Incoming Call UI
    incomingAlert.style.display = "block";
  }
}

async function handleUserUnpublished(user) {
  // If the user stops publishing (cancels or drops)
  if (remoteUser && user.uid === remoteUser.uid) {
    resetCallState();
  }
}

async function handleUserLeft(user) {
  if (remoteUser && user.uid === remoteUser.uid) {
    resetCallState();
  }
}

let callTimerIntent;
let seconds = 0;

function updateTimerDisplay() {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const timerEl = document.querySelector(".timer");
  if (timerEl) timerEl.textContent = `${mins}:${secs}`;
}

function startTimer() {
  stopTimer();
  seconds = 0;
  updateTimerDisplay();
  callTimerIntent = setInterval(() => {
    seconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (callTimerIntent) {
    clearInterval(callTimerIntent);
    callTimerIntent = null;
  }
  seconds = 0;
  updateTimerDisplay(); // Optional: reset to 00:00 or modify endCall logic to leave last time? Let's reset.
}

// ... existing code ...

async function acceptCall() {
  stopAlarm(); // STOP ALARM
  if (!remoteUser) return;

  try {
    // 1. Subscribe to remote audio
    await client.subscribe(remoteUser, "audio");
    remoteUser.audioTrack.play();

    // 2. Publish local microphone
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([localAudioTrack]);

    // 3. Update UI
    incomingAlert.style.display = "none";
    const callBox = document.getElementById("active-call");
    if (callBox) callBox.style.display = "block";

    startTimer();

  } catch (error) {
    console.error("Error accepting call:", error);
    alert("Failed to connect: " + error.message);
    stopAlarm();
  }
}

async function rejectCall() {
  stopAlarm();
  incomingAlert.style.display = "none";
  remoteUser = null;
}

async function endCall() {
  try {
    // Stop local audio
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
      localAudioTrack = null;
    }

    // Unpublish
    await client.unpublish();

    // Unsubscribe
    if (remoteUser) {
      await client.unsubscribe(remoteUser);
    }

    // Reset UI to Monitoring State
    const callBox = document.getElementById("active-call");
    if (callBox) callBox.style.display = "none";

    // STOP TIMER
    stopTimer();

  } catch (error) {
    console.error(error);
  }
}

function resetCallState() {
  stopAlarm();
  stopTimer(); // Ensure timer stops on reset

  incomingAlert.style.display = "none";
  const callBox = document.getElementById("active-call");
  if (callBox) callBox.style.display = "none";
  remoteUser = null;

  // Clean up local track if active
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack.close();
    localAudioTrack = null;
    client.unpublish().catch(e => console.error(e));
  }
}

// Start
initialize();
