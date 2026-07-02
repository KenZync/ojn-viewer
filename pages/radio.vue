<template>
  <div class="relative w-full h-screen bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-sans text-zinc-100">
    <!-- Unlocked Overlay / Tap to Join -->
    <div 
      v-if="!hasInteracted" 
      class="absolute inset-0 bg-zinc-950/90 z-50 flex flex-col items-center justify-center space-y-6 px-4"
    >
      <div class="text-center space-y-2 animate-pulse">
        <h1 class="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
          DMJAM P2P RADIO
        </h1>
        <p class="text-zinc-400 text-sm">Automated synchronized playback with peer-to-peer chat</p>
      </div>

      <div class="w-full max-w-xs space-y-3">
        <input 
          v-model="tempNickname" 
          type="text" 
          placeholder="Enter Nickname..." 
          class="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-all text-center text-white"
        />
        <button 
          @click="startRadio"
          class="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-purple-500/25 transition-all"
        >
          Tune In & Connect
        </button>
      </div>
    </div>

    <!-- Active UI View -->
    <div v-else class="w-full h-full flex flex-col md:flex-row relative">
      <!-- Top banner / Live Status (Mobile & Desktop) -->
      <div class="absolute top-4 right-4 z-40 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg px-4 py-2 flex items-center space-y-0 space-x-3 text-xs shadow-lg">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span class="font-semibold text-zinc-300">
          {{ isHost ? 'Hosting Radio' : 'Listening Live' }}
        </span>
        <span class="text-zinc-500">|</span>
        <span class="text-zinc-300">{{ peersCount }} listener(s)</span>
      </div>

      <!-- LEFT SIDE: Glassmorphic Chat Panel -->
      <div class="w-full md:w-80 h-1/3 md:h-full bg-zinc-900/30 backdrop-blur-lg border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col z-30 shrink-0">
        <div class="p-4 border-b border-zinc-800/80 shrink-0">
          <h2 class="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            DMJAM Live Chat
          </h2>
          <p class="text-xs text-zinc-500">Chat is ephemeral & peer-to-peer</p>
        </div>

        <!-- Message List -->
        <div ref="chatBox" class="flex-grow p-4 overflow-y-auto space-y-3 text-sm">
          <div 
            v-for="(msg, i) in chatHistory" 
            :key="i"
            class="flex flex-col space-y-0.5"
          >
            <div class="flex items-baseline space-x-2">
              <span 
                class="font-bold text-xs"
                :class="msg.isSystem ? 'text-purple-400' : 'text-cyan-400'"
              >
                {{ msg.nickname }}
              </span>
              <span class="text-[10px] text-zinc-600">{{ msg.timestamp }}</span>
            </div>
            <p :class="msg.isSystem ? 'text-zinc-400 italic text-xs' : 'text-zinc-300'">
              {{ msg.text }}
            </p>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="p-4 border-t border-zinc-800/80 shrink-0 bg-zinc-950/20">
          <form @submit.prevent="sendChatMessage" class="flex space-x-2">
            <input 
              v-model="chatInput" 
              type="text" 
              placeholder="Send message..."
              class="flex-grow bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 text-white"
            />
            <button 
              type="submit"
              class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <!-- RIGHT/CENTER SIDE: PASSIVE VISUALIZER (Main Player) -->
      <div class="flex-grow h-2/3 md:h-full relative flex items-center justify-center bg-zinc-950">
        <!-- Intermission Overlay -->
        <div 
          v-if="syncState?.intermission || loadingSong" 
          class="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center space-y-4"
        >
          <div class="text-center space-y-2">
            <p class="text-zinc-500 text-xs tracking-widest uppercase">Next Track Loading</p>
            <h3 class="text-xl font-bold text-zinc-300 animate-pulse">
              {{ loadingSong ? 'Fetching audio assets...' : 'Intermission / Loading next chart...' }}
            </h3>
            <p v-if="syncState && !loadingSong" class="text-zinc-600 text-xs">
              Starting in {{ syncState.timeLeftInSlot }}s
            </p>
          </div>
        </div>

        <!-- Render Workspace Mount -->
        <PlayerWorkspace 
          v-if="loadedChart && !syncState?.intermission"
          :chart-data="loadedChart"
          :seek-offset="seekOffset"
          :show-panel="false"
          :is-playing="isPlaying"
          :volume-level="volumeLevel"
        />

        <!-- Fallback if no chart is active -->
        <div v-else-if="!syncState?.intermission" class="text-center text-zinc-500 space-y-1 text-xs">
          <p>No active chart stream</p>
          <p class="text-[10px]">Retrieving daily synchronized schedule...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calculateActiveTrack, type RadioState } from "~/utils/radio-sync";
import { fetchAndParseDMJamTrack } from "~/utils/helpers/chart-loader";
import type { ConvertedOJN } from "~/types/dmjam";

const route = useRoute();

// UI States
const hasInteracted = ref(false);
const tempNickname = ref("");
const nickname = ref("");
const chatInput = ref("");
const chatHistory = ref<Array<{ nickname: string, text: string, timestamp: string, isSystem?: boolean }>>([]);
const chatBox = ref<HTMLElement | null>(null);

// Audio States
const loadedChart = ref<ConvertedOJN | null>(null);
const loadingSong = ref(false);
const volumeLevel = ref(0.2); // Default to low volume for radio background

const seed = useSeed();
const verticalMode = useVerticalMode();
const selectedDifficulty = useSelectedDifficulty();

// P2P / PeerJS States
const peer = ref<any>(null);
const isHost = ref(false);
const peersCount = ref(0);
const connections = ref<any[]>([]);
const activeConnection = ref<any>(null); // Listener's connection to host
const hostClockOffset = ref(0); // clock sync offset in ms

// Music List State
const trackCodes = ref<number[]>([]);
const syncState = ref<RadioState | null>(null);
let syncTimer: any = null;

const chartDataRef = computed<ConvertedOJN | undefined>(() => {
  if (!loadedChart.value) return undefined;
  return loadedChart.value;
});

// Setup audio controller hooks
const pattern = computed(() => {
  return seed.value.split("").map((char) => (parseInt(char) - 1).toString());
});

const {
  isPlaying,
  seekOffset,
  decodeAllSounds,
  startAudioPlayback,
  stopSong,
  seekTo,
} = useOjnAudio(chartDataRef, pattern, () => {});

// Local storage for nickname
onMounted(() => {
  const saved = localStorage.getItem("dmjam-radio-nickname");
  if (saved) {
    tempNickname.value = saved;
  } else {
    tempNickname.value = "Guest_" + Math.floor(1000 + Math.random() * 9000);
  }
});

// Clean up timers and connections on destroy
onUnmounted(() => {
  clearInterval(syncTimer);
  stopSong();
  verticalMode.value = false;
  if (peer.value) {
    peer.value.destroy();
  }
});

const scrollChatToBottom = async () => {
  await nextTick();
  if (chatBox.value) {
    chatBox.value.scrollTop = chatBox.value.scrollHeight;
  }
};

// Start P2P Engine & Tune In
const startRadio = async () => {
  if (!tempNickname.value.trim()) return;
  nickname.value = tempNickname.value.trim();
  localStorage.setItem("dmjam-radio-nickname", nickname.value);
  hasInteracted.value = true;
  verticalMode.value = true; // Lock into vertical layout mode

  // Load songs list from DMJam
  try {
    const chartsData = await $fetch<any[]>("https://dmjam.net/api/charts");
    trackCodes.value = chartsData.map((c) => c.music_code);
  } catch (err) {
    console.error("Failed to load music list:", err);
    // Fallback static chart list if API fails
    trackCodes.value = [10001, 10002, 10003];
  }

  // Initialize P2P
  initPeerJS();
  
  // Start the sync loop
  startSyncLoop();
};

// Setup PeerJS connection logic
const initPeerJS = async () => {
  // Import dynamically since Nuxt is SSR
  const { Peer } = await import("peerjs");

  // Attempt to claim host ID
  const hostId = "dmjam-radio-active-host-global";
  
  const testPeer = new Peer(hostId);

  testPeer.on("open", () => {
    // If successfully registered, this peer is the host
    peer.value = testPeer;
    isHost.value = true;
    peersCount.value = 1;
    addSystemMessage("System", "No active host found. You are now hosting the radio.");

    // Listen for incoming viewer connections
    peer.value.on("connection", (conn: any) => {
      connections.value.push(conn);
      peersCount.value = connections.value.length + 1;
      addSystemMessage("System", `A listener joined the stream.`);

      conn.on("open", () => {
        // Send initial clock synchronization offset
        conn.send({
          type: "sync",
          hostTime: Date.now(),
        });
      });

      conn.on("data", (data: any) => {
        if (data.type === "chat") {
          // Broadcast to all peers
          broadcastChat(data.nickname, data.text);
        }
      });

      conn.on("close", () => {
        connections.value = connections.value.filter((c) => c.peer !== conn.peer);
        peersCount.value = connections.value.length + 1;
        addSystemMessage("System", `A listener disconnected.`);
      });
    });
  });

  testPeer.on("error", (err: any) => {
    if (err.type === "unavailable-id") {
      // Host ID taken, instantiate as client listener
      isHost.value = false;
      const clientPeer = new Peer();
      
      clientPeer.on("open", (id: string) => {
        peer.value = clientPeer;
        addSystemMessage("System", `Connected to signaling server.`);
        
        // Connect to active host
        const conn = peer.value.connect(hostId);
        activeConnection.value = conn;
        
        conn.on("open", () => {
          addSystemMessage("System", "Synced with active radio host.");
        });

        conn.on("data", (data: any) => {
          if (data.type === "sync") {
            hostClockOffset.value = data.hostTime - Date.now();
          } else if (data.type === "chat") {
            chatHistory.value.push({
              nickname: data.nickname,
              text: data.text,
              timestamp: new Date().toLocaleTimeString(),
              isSystem: data.isSystem
            });
            scrollChatToBottom();
          }
        });

        conn.on("close", () => {
          addSystemMessage("System", "Host disconnected. Re-electing new host...");
          activeConnection.value = null;
          // Trigger Host Election
          setTimeout(() => {
            initPeerJS();
          }, 1000 + Math.random() * 2000);
        });
      });
    } else {
      console.error("PeerJS error:", err);
    }
  });
};

const addSystemMessage = (name: string, text: string) => {
  chatHistory.value.push({
    nickname: name,
    text,
    timestamp: new Date().toLocaleTimeString(),
    isSystem: true
  });
  scrollChatToBottom();
};

const broadcastChat = (senderNick: string, text: string, system = false) => {
  const payload = {
    nickname: senderNick,
    text,
    timestamp: new Date().toLocaleTimeString(),
    isSystem: system
  };
  
  chatHistory.value.push(payload);
  scrollChatToBottom();

  if (isHost.value) {
    // Host relays to all connected listeners
    connections.value.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "chat",
          ...payload
        });
      }
    });
  }
};

const sendChatMessage = () => {
  if (!chatInput.value.trim()) return;

  if (isHost.value) {
    broadcastChat(nickname.value, chatInput.value);
  } else if (activeConnection.value && activeConnection.value.open) {
    activeConnection.value.send({
      type: "chat",
      nickname: nickname.value,
      text: chatInput.value
    });
    // Add locally to client
    chatHistory.value.push({
      nickname: nickname.value,
      text: chatInput.value,
      timestamp: new Date().toLocaleTimeString()
    });
    scrollChatToBottom();
  }
  chatInput.value = "";
};

// Periodic Synchronization Loop
const startSyncLoop = () => {
  let lastTrackCode = 0;
  
  syncTimer = setInterval(async () => {
    if (trackCodes.value.length === 0) return;

    const state = calculateActiveTrack(trackCodes.value, hostClockOffset.value);
    syncState.value = state;

    if (!state) return;

    if (state.intermission) {
      if (isPlaying.value) {
        stopSong();
        loadedChart.value = null;
      }
      return;
    }

    // Trigger load of new track if it changed
    if (state.activeTrackCode !== lastTrackCode) {
      lastTrackCode = state.activeTrackCode;
      await loadRadioTrack(state.activeTrackCode, state.playbackOffset);
    }
  }, 1000);
};

// Async track loading
const loadRadioTrack = async (musicCode: number, offsetSeconds: number) => {
  loadingSong.value = true;
  stopSong();
  loadedChart.value = null;

  try {
    const converted = await fetchAndParseDMJamTrack(musicCode, selectedDifficulty.value);
    loadedChart.value = converted;

    // Decode and start playing at the current offset
    await decodeAllSounds();
    
    // Safety check: make sure we aren't loading while transitioning
    if (syncState.value && !syncState.value.intermission) {
      const offsetMs = offsetSeconds * 1000;
      await startAudioPlayback(offsetMs);
    }
  } catch (err) {
    console.error("Failed loading radio track:", err);
  } finally {
    loadingSong.value = false;
  }
};
</script>
