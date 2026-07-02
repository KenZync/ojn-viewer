<template>
  <div class="relative w-full h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans text-zinc-100 select-none">
    <!-- Unified Global Header (60px) -->
    <header class="flex justify-between items-center h-[60px] bg-zinc-900 border-b border-zinc-800 px-3 sm:px-4 md:px-6 flex-shrink-0 z-20 text-white select-text font-sans">
      <!-- Left Side: Header Song details -->
      <div class="flex items-center min-w-0 flex-grow sm:flex-grow-0">
        <div v-if="loadedChart" class="flex items-center space-x-2.5 sm:space-x-4 min-w-0 w-full sm:w-auto">
          <!-- Level Badge -->
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex-shrink-0 border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Lv.{{ chartLevel }}
          </span>
          <!-- Title & Artist -->
          <div class="flex flex-col sm:flex-row sm:items-baseline text-left min-w-0 sm:space-x-2 text-sm sm:text-base md:text-md">
            <span class="text-white font-extrabold tracking-wide truncate max-w-[180px] sm:max-w-[280px]">
              {{ loadedChart.header.title }}
            </span>
            <span class="text-zinc-700 hidden sm:inline select-none">•</span>
            <span class="text-zinc-400 truncate max-w-[180px] sm:max-w-[240px] text-xs sm:text-sm font-medium">
              {{ loadedChart.header.artist }}
            </span>
            <span class="text-zinc-700 select-none hidden xl:inline">•</span>
            <!-- Header Details Chips -->
            <div class="hidden xl:flex items-center space-x-3 flex-shrink-0 text-xs">
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">obj:</span>
                <span class="text-zinc-100 font-bold truncate max-w-[150px]">{{ loadedChart.header.noter }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">BPM:</span>
                <span class="text-zinc-100 font-bold">{{ loadedChart.header.bpm }}</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="text-zinc-500 font-medium">Time:</span>
                <span class="text-zinc-100 font-bold">{{ formattedCurrentTime }} / {{ formattedTotalTime }}</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col text-left">
          <span class="text-white text-base sm:text-xl font-extrabold tracking-wide uppercase">
            DMJAM P2P Radio
          </span>
        </div>
      </div>

      <!-- Right Side actions: Connection status, Volume & Exit Buttons -->
      <div class="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 pl-2">
        <!-- Connection status badge -->
        <div class="flex items-center space-x-1.5 bg-zinc-950/40 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] sm:text-xs">
          <span class="flex h-1.5 w-1.5 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
          <span class="font-semibold text-zinc-300">
            {{ isHost ? 'Host' : 'Listener' }} ({{ peersCount }})
          </span>
        </div>

        <!-- Master Volume Slider -->
        <div class="hidden sm:flex items-center space-x-2 select-none mr-2">
          <span class="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            v-model="volumeLevel"
            class="w-24 h-1.5 bg-zinc-700/90 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span class="w-8 text-right font-bold text-white text-xs">{{ Math.round(volumeLevel * 100) }}%</span>
        </div>

        <!-- Settings Sidebar Toggle -->
        <button 
          @click="showSettings = !showSettings"
          aria-label="Settings"
          class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <!-- Home Button -->
        <NuxtLink 
          to="/" 
          aria-label="Home"
          class="w-10 h-10 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </NuxtLink>
      </div>
    </header>

    <!-- Main Layout Body -->
    <div class="flex-grow w-full flex flex-col md:flex-row overflow-hidden relative">
      <!-- LEFT SIDE: Glassmorphic Chat Panel -->
      <div class="w-full md:w-80 h-1/3 md:h-full bg-zinc-900/40 backdrop-blur-lg border-b md:border-b-0 md:border-r border-zinc-800/80 flex flex-col z-30 shrink-0">
        <div class="p-4 border-b border-zinc-800/80 shrink-0 space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-md font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              DMJAM Live Chat
            </h2>
            <span class="text-[10px] text-zinc-500">P2P Room</span>
          </div>
          <!-- Nickname Editor -->
          <div class="flex items-center space-x-1.5 bg-zinc-950/60 border border-zinc-800/85 rounded px-2.5 py-1.5 text-xs">
            <span class="text-zinc-500 text-[10px] uppercase font-bold select-none">Name:</span>
            <input 
              v-model="nickname" 
              @change="updateNickname" 
              type="text" 
              class="bg-transparent border-none focus:outline-none text-zinc-200 font-semibold w-full"
              placeholder="Nickname..."
            />
          </div>
        </div>

        <!-- Message List -->
        <div ref="chatBox" class="flex-grow p-4 overflow-y-auto space-y-4 text-sm select-text">
          <div 
            v-for="(msg, i) in chatHistory" 
            :key="i"
            class="flex flex-col space-y-1"
          >
            <div class="flex items-baseline space-x-2">
              <span 
                class="font-bold text-sm"
                :class="msg.isSystem ? 'text-emerald-400' : 'text-cyan-400'"
              >
                {{ msg.nickname }}
              </span>
              <span class="text-[11px] text-zinc-600">{{ msg.timestamp }}</span>
            </div>
            <p :class="msg.isSystem ? 'text-zinc-400 italic text-xs' : 'text-zinc-200 text-sm leading-relaxed'">
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
              class="flex-grow bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
            />
            <button 
              type="submit"
              class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <!-- RIGHT/CENTER SIDE: VISUALIZER (Main Player) -->
      <div class="flex-grow h-2/3 md:h-full relative flex flex-col bg-zinc-950">
        <div class="flex-grow w-full relative overflow-hidden bg-zinc-950">


          <!-- Fetching overlay -->
          <div 
            v-if="loadingSong" 
            class="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center space-y-3"
          >
            <h3 class="text-base font-bold text-zinc-300 animate-pulse">
              Fetching audio assets...
            </h3>
          </div>

          <!-- Player Canvas mount -->
          <PlayerWorkspace 
            v-if="loadedChart"
            :chart-data="loadedChart"
            :seek-offset="seekOffset"
            v-model:show-panel="showSettings"
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
const hasInteracted = ref(true); // Auto join immediately
const nickname = ref("");
const chatInput = ref("");
const chatHistory = ref<Array<{ nickname: string, text: string, timestamp: string, isSystem?: boolean }>>([]);
const chatBox = ref<HTMLElement | null>(null);
const showSettings = ref(true);

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
    nickname.value = saved;
  } else {
    nickname.value = "Guest_" + Math.floor(1000 + Math.random() * 9000);
  }
  window.addEventListener("resize", setRadioVerticalScale);

  // Auto connect/tune in instantly
  startRadio();
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

const updateNickname = () => {
  const trimmed = nickname.value.trim();
  if (trimmed) {
    nickname.value = trimmed;
    localStorage.setItem("dmjam-radio-nickname", trimmed);
  }
};

const scrollChatToBottom = async () => {
  await nextTick();
  if (chatBox.value) {
    chatBox.value.scrollTop = chatBox.value.scrollHeight;
  }
};

// Start P2P Engine & Tune In
const startRadio = async () => {
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
            hostTrackStartTime.value = data.startTime;
            loadRadioTrack(data.musicCode, 0); // Offset is calculated dynamically in loadRadioTrack
          } else if (data.type === "song_changed") {
            hostTrackStartTime.value = data.startTime;
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
  
  // To prevent the settings sidebar from disappearing, we keep the previous chart loaded
  // until the new chart assets are loaded, instead of setting loadedChart to null.
  if (!loadedChart.value) {
    loadedChart.value = null;
  }

  try {
    const converted = await fetchAndParseDMJamTrack(musicCode, selectedDifficulty.value);
    loadedChart.value = converted;

    // Decode all sounds
    await decodeAllSounds();
    
    // Play immediately at the seek offset (calculate right before playing to account for load latency)
    const elapsedSinceStartMs = Date.now() + hostClockOffset.value - hostTrackStartTime.value;
    const offsetMs = Math.max(0, Math.floor(elapsedSinceStartMs));

    const durationSec = converted.header?.difficulty?.[selectedDifficulty.value]?.duration || 0;
    const durationMs = durationSec * 1000;

    if (offsetMs < durationMs) {
      await startAudioPlayback(offsetMs);
    }

    // Broadcast what is currently playing as a system chat message
    const timeFormatted = fancyTimeFormat(durationSec);
    const desc = `${converted.header.title} by ${converted.header.artist} (Level: ${chartLevel.value}) | obj: ${converted.header.noter} | BPM: ${converted.header.bpm} | Time: ${timeFormatted}`;
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
