# SafePath Emergency 🚨
### Real-Time Caregiver Monitoring & Emergency Alert System

SafePath Emergency is a dedicated safety solution designed to connect users in distress with caregivers immediately. The system consists of two parts:
1.  **Caregiver Portal (Web Dashboard)**: An "Always Online" monitoring dashboard that receives real-time alerts and audio calls.
2.  **User App (Mobile)**: A simple, one-tap emergency trigger app that connects to the caregiver instantly.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   **For Mobile App**: [Expo Go](https://expo.dev/client) app installed on your physical Android/iOS device.

---

## 🚀 Installation & Setup

### 1. Caregiver Portal (Web)
This is the command center for receiving alerts.

```bash
# Navigate to the web project directory
cd agora_web_quickstart

# Install dependencies
npm install
```

### 2. User App (Mobile)
This is the client app for triggering emergencies.

```bash
# Navigate to the mobile project directory
cd agora_mobile_quickstart

# Install dependencies
npm install
```

---

## ▶️ How to Run

### Step 1: Start the Caregiver Web Portal
You must start the web portal first so it can listen for incoming alerts.

1.  Open a terminal in `agora_web_quickstart`.
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  **Open in Browser**:
    *   Go to **[http://localhost:5173](http://localhost:5173)** (or the URL shown in your terminal).
    *   **IMPORTANT**: Click anywhere on the webpage to activate the audio engine (an overlay will prompt you).
    *   The status should show **"Online & Monitoring"**.

### Step 2: Start the User Mobile App
1.  Open a new terminal in `agora_mobile_quickstart`.
2.  Start the Expo server:
    ```bash
    npx expo start
    ```
3.  **Run on Device**:
    *   Scan the QR code displayed in the terminal using the **Expo Go** app on your phone.
    *   Wait for the app to bundle and load.

---

## 🚨 Usage Guide

1.  **Monitoring**: Keep the Web Portal open. It is designed to be "Always Online".
2.  **Trigger Emergency**: On the mobile app, press the **RED EMERGENCY BUTTON**.
3.  **Receive Alert**:
    *   The Web Portal will flash red.
    *   A loud customized alarm will sound.
    *   Click **"Accept Call"** to establish 2-way audio.
    *   Click **"Reject"** to dismiss the alert.
4.  **Timer**: Once connected, a timer will track the duration of the emergency call.

---

## 🛑 Stopping the System

To stop the servers:
*   Click inside the terminal running the process.
*   Press **`Ctrl + C`** on your keyboard to terminate the batch job.

---

## 🛠 Tech Stack
*   **Web**: Vite, Vanilla JS, CSS (Dark Glassmorphism Theme), Agora Web SDK.
*   **Mobile**: React Native, Expo, Agora React Native SDK.
*   **Audio**: Web Audio API for custom alarm generation.
