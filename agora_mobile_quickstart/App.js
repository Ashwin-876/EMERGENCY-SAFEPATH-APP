import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, PermissionsAndroid, ActivityIndicator, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { createAgoraRtcEngine, ClientRoleType, ChannelProfileType } from 'react-native-agora';
import { StatusBar } from 'expo-status-bar';

const appId = '09470838be104240bcaede1829fd7815';
const channelName = 'emergency-channel';
const token = null;
const uid = 0; // 0 lets Agora assign a UID

export default function App() {
  const agoraEngineRef = useRef(null);
  const [isJoined, setIsJoined] = useState(false);
  const [peerIds, setPeerIds] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    setupVoiceSDK();

    return () => {
      destroyAgoraEngine();
    };
  }, []);

  const setupVoiceSDK = async () => {
    try {
      // 1. Request Permissions
      if (Platform.OS === 'android') {
        await getPermission();
      }

      // 2. Create and Initialize Engine
      agoraEngineRef.current = createAgoraRtcEngine();
      const engine = agoraEngineRef.current;

      engine.initialize({
        appId: appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // 3. Register Event Handlers
      engine.registerEventHandler({
        onJoinChannelSuccess: (_connection, elapsed) => {
          console.log('Successfully joined channel');
          setIsJoined(true);
        },
        onUserJoined: (_connection, remoteUid, elapsed) => {
          console.log('Remote user joined:', remoteUid);
          setPeerIds(prev => [...prev, remoteUid]);
        },
        onUserOffline: (_connection, remoteUid, reason) => {
          console.log('Remote user offline:', remoteUid);
          setPeerIds(prev => prev.filter(id => id !== remoteUid));
        },
        onLeaveChannel: (_connection, stats) => {
          console.log('Left channel', stats);
          setIsJoined(false);
          setPeerIds([]);
          setIsEmergency(false);
        },
        onError: (code, msg) => {
          console.error("Agora Error:", code, msg);
        }
      });

      // Allow speakerphone by default for testing
      engine.setEnableSpeakerphone(true);

      setIsInitialized(true);
    } catch (e) {
      console.error(e);
    }
  };

  const destroyAgoraEngine = () => {
    agoraEngineRef.current?.unregisterEventHandler();
    agoraEngineRef.current?.release();
  };

  const getPermission = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        'android.permission.POST_NOTIFICATIONS' // Request Notification permission for Android 13+
      ]);
    }
  };

  const triggerEmergency = async () => {
    if (isJoined) return;
    setIsEmergency(true);
    try {
      agoraEngineRef.current?.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      agoraEngineRef.current?.joinChannel(token, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
      // Simulate Notification Permission request (mock or native if needed)
      // Since this is generic mobile, we assume OS handles native permissions via manifest/runtime request above.
    } catch (e) {
      console.error(e);
      setIsEmergency(false);
    }
  };

  const leave = async () => {
    try {
      agoraEngineRef.current?.leaveChannel();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>System Initializing...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.card}>
        <Text style={styles.title}>Emergency System</Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isJoined ? styles.connected : styles.disconnected]} />
          <Text style={styles.statusText}>{isJoined ? 'Active' : 'Standby'}</Text>
        </View>

        {isEmergency && isJoined && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>
              {peerIds.length > 0 ? "Call Connected" : "Calling caregiver..."}
            </Text>
            {peerIds.length === 0 && <ActivityIndicator size="small" color="#fff" style={{ marginTop: 10 }} />}
          </View>
        )}

        <View style={styles.buttonGroup}>
          {!isJoined ? (
            <TouchableOpacity style={styles.emergencyBtn} onPress={triggerEmergency}>
              <Text style={styles.emergencyBtnText}>EMERGENCY</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.leaveBtn} onPress={leave}>
              <Text style={[styles.btnText, styles.leaveBtnText]}>Cancel Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // Gray 900
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)', // Red tint border
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.51,
    shadowRadius: 13.16,
    elevation: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 30,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#22c55e',
    boxShadow: '0 0 10px #22c55e',
  },
  disconnected: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    color: '#d1d5db',
    fontSize: 16,
  },
  alertBox: {
    marginBottom: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  alertText: {
    color: '#fca5a5', // Red 300
    fontSize: 18,
    fontWeight: '600',
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  emergencyBtn: {
    backgroundColor: '#ef4444', // Red 500
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#b91c1c',
  },
  emergencyBtnText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  leaveBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  leaveBtnText: {
    color: '#e5e7eb',
  }
});
