<template>
  <div class="relative w-full h-screen bg-zinc-950 flex flex-col md:flex-row overflow-hidden font-sans text-zinc-100 select-none">
    <!-- Unlocked Overlay / Tap to Join -->
    <div 
      v-if="!hasInteracted" 
      class="absolute inset-0 bg-zinc-950/95 z-50 flex flex-col items-center justify-center space-y-6 px-4"
    >
      <div class="text-center space-y-2 animate-pulse">
        <h1 class="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-green-500 to-teal-400 bg-clip-text text-transparent drop-shadow-lg">
          DMJAM P2P RADIO
        </h1>
        <p class="text-zinc-400 text-sm">Automated synchronized playback with peer-to-peer chat</p>
      </div>

      <div class="w-full max-w-xs space-y-3">
        <input 
          v-model="tempNickname" 
          type="text" 
          placeholder="Enter Nickname..." 
          class="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all text-center text-white"
        />
        <button 
          @click="startRadio"
          class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-lg text-sm shadow-lg shadow-emerald-500/25 transition-all"
        >
          Tune In & Connect
        </button>
      </div>
    </div>

    <!-- Active UI View -->
    <div v-else class="w-full h-full flex flex-col md:flex-row relative">
      <!-- LEFT SIDE: Glassmorphic Chat Panel -->
      <div class="w-full md:w-80 h-1/3 md:h-full bg-zinc-900/40 backdrop-blur-lg border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col z-30 shrink-0">
        <div class="p-4 border-b border-zinc-800/80 shrink-0">
          <h2 class="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
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
                :class="msg.isSystem ? 'text-emerald-400' : 'text-cyan-400'"
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
              class="flex-grow bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white"
            />
            <button 
              type="submit"
              class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <!-- RIGHT/CENTER SIDE: VISUALIZER (Main Player) -->
      <div class="flex-grow h-2/3 md:h-full relative flex flex-col bg-zinc-950">
        <!-- Top Status Banner & Metadata Header -->
        <div class="w-full bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between z-40 shrink-0 gap-4">
          <!-- Active Track Metadata Info -->
          <div class="flex flex-col space-y-1">
            <div v-if="loadedChart" class="flex items-center space-x-3">
              <span class="text-xs uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-1.5 font-bold tracking-wider">
                Now Playing
              </span>
              <h3 class="text-base font-bold text-white tracking-wide">
                {{ loadedChart.header.title }}
              </h3>
            </div>
            <div v-else class="flex items-center space-x-2">
              <span class="h-2 w-2 rounded-full bg-zinc-600 animate-pulse"></span>
              <p class="text-zinc-500 text-sm">Radio is idle / Selecting next track...</p>
            </div>
            
            <p v-if="loadedChart" class="text-xs text-zinc-400">
              Artist: <span class="text-zinc-300 font-medium">{{ loadedChart.header.artist }}</span>
              <span class="mx-2 text-zinc-600">•</span>
              Charter: <span class="text-zinc-300 font-medium">{{ loadedChart.header.note_charter }}</span>
              <span class="mx-2 text-zinc-600">•</span>
              Level: <span class="text-pink-400 font-bold">{{ chartLevel }}</span>
              <span class="mx-2 text-zinc-600">•</span>
              BPM: <span class="text-cyan-400 font-semibold">{{ loadedChart.header.bpm }}</span>
              <span class="mx-2 text-zinc-600">•</span>
              Time: <span class="text-yellow-400 font-medium">{{ formattedCurrentTime }} / {{ formattedTotalTime }}</span>
            </p>
          </div>

          <!-- Controls: Volume & Connection Status -->
          <div class="flex items-center space-x-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <!-- Volume Control -->
            <div class="flex items-center space-x-2 bg-zinc-950/40 px-3 py-1.5 rounded-lg border border-zinc-850">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-zinc-400">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.874c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
              <input 
                v-model.number="volumeLevel" 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                class="w-20 accent-emerald-500 h-1 rounded-lg bg-zinc-800 cursor-pointer"
              />
            </div>

            <!-- Connection Status -->
            <div class="flex items-center space-x-2 text-xs">
              <span class="flex h-2 w-2 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span class="font-semibold text-zinc-300">
                {{ isHost ? 'Host' : 'Listener' }} ({{ peersCount }})
              </span>
            </div>
          </div>
        </div>

        <!-- Render Workspace Mount -->
        <div class="flex-grow w-full relative flex items-center justify-center bg-zinc-950">
          <div 
            v-if="loadingSong" 
            class="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center space-y-3"
          >
            <h3 class="text-base font-bold text-zinc-300 animate-pulse">
              Fetching audio assets...
            </h3>
          </div>

          <PlayerWorkspace 
            v-if="loadedChart"
            :chart-data="loadedChart"
            :seek-offset="seekOffset"
            :show-panel="false"
            :is-playing="isPlaying"
            :volume-level="volumeLevel"
          />

          <!-- Fallback if no chart is active -->
          <div v-else-if="!loadingSong" class="text-center text-zinc-500 space-y-1 text-xs">
            <p>Ready to play.</p>
            <p v-if="isHost" class="text-[10px] text-emerald-400">Selecting a random chart to broadcast...</p>
            <p v-else class="text-[10px] text-cyan-400">Waiting for host to sync playback state...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from "vue";
import { fetchAndParseDMJamTrack } from "~/utils/helpers/chart-loader";
import { fancyTimeFormat } from "~/utils/helpers/formatter";
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

const seed = useSeed();
const verticalMode = useVerticalMode();
const selectedDifficulty = useSelectedDifficulty();
const scaleW = useScaleW();
const scaleH = useScaleH();
const noteHeight = useNoteHeight();

// P2P / PeerJS States
const peer = ref<any>(null);
const isHost = ref(false);
const peersCount = ref(0);
const connections = ref<any[]>([]);
const activeConnection = ref<any>(null); // Listener's connection to host
const hostClockOffset = ref(0); // clock sync offset in ms

// Music List State
const trackCodes = ref<number[]>([]);
const hostCurrentTrackCode = ref<number>(0);
const hostTrackStartTime = ref<number>(0);

const chartDataRef = computed<ConvertedOJN | undefined>(() => {
  if (!loadedChart.value) return undefined;
  return loadedChart.value;
});

const chartLevel = computed(() => {
  if (!loadedChart.value) return 0;
  const header = loadedChart.value.header;
  const diff = selectedDifficulty.value;
  return header.difficulty?.[diff]?.level || 0;
});

const formattedCurrentTime = computed(() => {
  return fancyTimeFormat(Math.floor(seekOffset.value / 1000));
});

const formattedTotalTime = computed(() => {
  if (!loadedChart.value) return "0:00";
  const diff = selectedDifficulty.value;
  const durationSec = loadedChart.value.header?.difficulty?.[diff]?.duration || 0;
  return fancyTimeFormat(durationSec);
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
  volumeLevel,
} = useOjnAudio(chartDataRef, pattern, () => {});

// Configure correct OJN visualizer ratio for vertical mode on desktop vs mobile
const setRadioVerticalScale = () => {
  verticalMode.value = true;
  if (window.innerWidth < 1280) {
    scaleW.value = 8;
    scaleH.value = 6;
    noteHeight.value = 10;
  } else {
    scaleW.value = 15;
    scaleH.value = 10;
    noteHeight.value = 20;
  }
};

const resetRadioScale = () => {
  verticalMode.value = false;
  scaleW.value = 7;
  scaleH.value = 2;
  noteHeight.value = 4;
};

// Local storage for nickname
onMounted(() => {
  const saved = localStorage.getItem("dmjam-radio-nickname");
  if (saved) {
    tempNickname.value = saved;
  } else {
    tempNickname.value = "Guest_" + Math.floor(1000 + Math.random() * 9000);
  }
  window.addEventListener("resize", setRadioVerticalScale);
});

// Clean up on destroy
onUnmounted(() => {
  stopSong();
  resetRadioScale();
  window.removeEventListener("resize", setRadioVerticalScale);
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
  setRadioVerticalScale(); // Lock into correct vertical layout ratio

  // Load songs list from DMJam
  try {
    const chartsData = await $fetch<any[]>("https://dmjam.net/api/charts");
    trackCodes.value = chartsData.map((c) => c.music_code);
  } catch (err) {
    console.error("Failed to load music list:", err);
    trackCodes.value = [10001, 10002, 10003];
  }

  // Initialize P2P
  initPeerJS();
};

// Setup PeerJS connection logic
const initPeerJS = async () => {
  const { Peer } = await import("peerjs");

  const hostId = "dmjam-radio-active-host-global-v2";
  const testPeer = new Peer(hostId);

  testPeer.on("open", () => {
    peer.value = testPeer;
    isHost.value = true;
    peersCount.value = 1;
    addSystemMessage("System", "No active host found. You are now hosting the radio.");

    // Pick first random song immediately
    playNextRandomSong();

    // Listen for incoming viewer connections
    peer.value.on("connection", (conn: any) => {
      connections.value.push(conn);
      peersCount.value = connections.value.length + 1;
      addSystemMessage("System", "A listener joined the stream.");

      conn.on("open", () => {
        // Send initial sync payload
        conn.send({
          type: "sync",
          hostTime: Date.now(),
          musicCode: hostCurrentTrackCode.value,
          startTime: hostTrackStartTime.value,
        });
      });

      conn.on("data", (data: any) => {
        if (data.type === "chat") {
          broadcastChat(data.nickname, data.text);
        }
      });

      conn.on("close", () => {
        connections.value = connections.value.filter((c) => c.peer !== conn.peer);
        peersCount.value = connections.value.length + 1;
        addSystemMessage("System", "A listener disconnected.");
      });
    });
  });

  testPeer.on("error", (err: any) => {
    if (err.type === "unavailable-id") {
      isHost.value = false;
      const clientPeer = new Peer();
      
      clientPeer.on("open", () => {
        peer.value = clientPeer;
        addSystemMessage("System", "Connected. Synced with radio host.");
        
        const conn = peer.value.connect(hostId);
        activeConnection.value = conn;

        conn.on("data", (data: any) => {
          if (data.type === "sync") {
            hostClockOffset.value = data.hostTime - Date.now();
            const offsetMs = Date.now() + hostClockOffset.value - data.startTime;
            loadRadioTrack(data.musicCode, offsetMs / 1000);
          } else if (data.type === "song_changed") {
            loadRadioTrack(data.musicCode, 0);
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
    chatHistory.value.push({
      nickname: nickname.value,
      text: chatInput.value,
      timestamp: new Date().toLocaleTimeString()
    });
    scrollChatToBottom();
  }
  chatInput.value = "";
};

const broadcastSongChange = (musicCode: number, startTime: number) => {
  if (isHost.value) {
    connections.value.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "song_changed",
          musicCode,
          startTime
        });
      }
    });
  }
};

// Transition instantly to a new random track
const playNextRandomSong = async () => {
  if (trackCodes.value.length === 0) return;
  const randomIndex = Math.floor(Math.random() * trackCodes.value.length);
  const nextTrackCode = trackCodes.value[randomIndex];

  hostCurrentTrackCode.value = nextTrackCode;
  hostTrackStartTime.value = Date.now();

  await loadRadioTrack(nextTrackCode, 0);
  broadcastSongChange(nextTrackCode, hostTrackStartTime.value);
};

// Watch for host track ending to trigger next song immediately
watch(isPlaying, (playing) => {
  if (!playing && isHost.value && loadedChart.value && !loadingSong.value) {
    playNextRandomSong();
  }
});

// Async track loading and starting audio
const loadRadioTrack = async (musicCode: number, offsetSeconds: number) => {
  loadingSong.value = true;
  stopSong();
  loadedChart.value = null;

  try {
    const converted = await fetchAndParseDMJamTrack(musicCode, selectedDifficulty.value);
    loadedChart.value = converted;

    // Decode all sounds
    await decodeAllSounds();
    
    // Play immediately at the seek offset
    const offsetMs = Math.max(0, Math.floor(offsetSeconds * 1000));
    await startAudioPlayback(offsetMs);

    // Broadcast what is currently playing as a system chat message
    const durationSec = converted.header?.difficulty?.[selectedDifficulty.value]?.duration || 0;
    const timeFormatted = fancyTimeFormat(durationSec);
    const desc = `${converted.header.title} by ${converted.header.artist} (Level: ${chartLevel.value}) | Obj: ${converted.header.note_charter} | BPM: ${converted.header.bpm} | Time: ${timeFormatted}`;
    broadcastChat("System", `Now playing: ${desc}`, true);
  } catch (err) {
    console.error("Failed loading radio track:", err);
    // Auto-skip failed songs if we are the host
    if (isHost.value) {
      setTimeout(() => {
        playNextRandomSong();
      }, 2000);
    }
  } finally {
    loadingSong.value = false;
  }
};
</script>
