export function useOjnAudio(
  chartData: Ref<ConvertedOJN | undefined>,
  configuredPattern: ComputedRef<string[]>,
  onPlayheadTick?: (timeMs: number) => void
) {
  const isPlaying = ref<boolean>(false);
  const seekOffset = ref<number>(0); // Current playback offset in milliseconds
  const isDecoding = ref<boolean>(false);
  const decodingProgress = ref<number>(0);
  const decodingTotal = ref<number>(0);
  const volumeLevel = ref<number>(0.5); // Master volume (0 to 1)

  const audioContext = ref<AudioContext | null>(null);
  const audioBuffers = ref<{ [key: string]: AudioBuffer }>({});
  
  let startTimeOfPlayback = 0; // audioContext.currentTime in seconds when playback started
  let activeAudioSources: AudioBufferSourceNode[] = [];
  let playheadAnimationFrameId: number | null = null;
  let masterGainNode: GainNode | null = null;

  // Performance: sorted cache of notes for O(1) amortized scheduling
  let sortedNotesCache: Array<any> | null = null;
  let schedulePointer = 0; // Index into sortedNotesCache: all notes before this have been scheduled

  // Use a plain Set (not Vue ref) to avoid reactive proxy overhead in the scheduling hot loop
  let scheduledNoteIds = new Set<string>();

  // Cached values set at playback start — avoids calling composables / scanning score every frame
  let cachedTotalDurationMs = 0;
  let hasStereoPane = false; // cached StereoPannerNode support

  const base64ToArrayBuffer = (base64String: string): ArrayBuffer => {
    const commaIndex = base64String.indexOf(",");
    const pureBase64 = commaIndex !== -1 ? base64String.substring(commaIndex + 1) : base64String;
    const binaryString = window.atob(pureBase64);
    const length = binaryString.length;
    const bytesArray = new Uint8Array(length);
    
    for (let i = 0; i < length; i++) {
      bytesArray[i] = binaryString.charCodeAt(i);
    }
    return bytesArray.buffer;
  };

  const initAudioContext = (): AudioContext => {
    if (!audioContext.value || audioContext.value.state === "closed") {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNode = null;
    }
    if (audioContext.value.state === "suspended") {
      audioContext.value.resume();
    }
    if (!masterGainNode && audioContext.value) {
      masterGainNode = audioContext.value.createGain();
      masterGainNode.gain.value = volumeLevel.value;
      masterGainNode.connect(audioContext.value.destination);
    }
    return audioContext.value;
  };

  const decodeAllSounds = async (): Promise<void> => {
    audioBuffers.value = {};
    isDecoding.value = false;
    // Invalidate the sorted notes cache whenever chart data changes
    sortedNotesCache = null;
    schedulePointer = 0;
    
    const hitSounds = chartData.value?.hitSounds;
    if (!hitSounds || Object.keys(hitSounds).length === 0) {
      return;
    }

    const context = initAudioContext();
    isDecoding.value = true;
    decodingProgress.value = 0;

    const soundKeys = Object.keys(hitSounds);
    decodingTotal.value = soundKeys.length;

    const batchLimit = 50;
    for (let i = 0; i < soundKeys.length; i += batchLimit) {
      const batchChunk = soundKeys.slice(i, i + batchLimit);
      await Promise.all(
        batchChunk.map(async (key) => {
          try {
            const base64 = hitSounds[key];
            if (!base64 || base64.length <= 150) {
              return;
            }
            
            const arrayBuffer = base64ToArrayBuffer(base64);
            const decodedBuffer = await context.decodeAudioData(arrayBuffer);
            audioBuffers.value[key] = decodedBuffer;
          } catch (error) {
            console.warn(`Failed to decode sample ${key}:`, error);
          } finally {
            decodingProgress.value++;
          }
        })
      );
    }
    isDecoding.value = false;
  };

  const stopAllAudio = (): void => {
    for (const sourceNode of activeAudioSources) {
      try {
        sourceNode.stop();
      } catch (error) {
        // Audio node already stopped
      }
    }
    activeAudioSources = [];
  };

  const getChartDurationMs = (): number => {
    const ribbitData = chartData.value?.ribbit;
    if (!ribbitData || !ribbitData.score) {
      return 0;
    }
    const score = ribbitData.score;
    for (let m = score.length - 1; m >= 0; m--) {
      const measure = score[m];
      const timingLines = measure["88"];
      if (timingLines && timingLines.length > 0) {
        const firstLine = timingLines[0];
        const measureStartTime = firstLine[4] as number;
        const measureDuration = timingLines.reduce((acc: number, line: any) => acc + (line[3] || 0), 0);
        return measureStartTime + measureDuration;
      }
    }
    return 0;
  };

  const stopPlayheadAnimation = (): void => {
    if (playheadAnimationFrameId !== null) {
      cancelAnimationFrame(playheadAnimationFrameId);
      playheadAnimationFrameId = null;
    }
  };

  const getActiveNotesForPlayback = () => {
    const hardData = chartData.value?.hard;
    if (!hardData) return [];
    return [
      ...(hardData.notes || []).map((n, i) => ({ ...n, id: `note_${i}` })),
      ...(hardData.timeSounds || []).map((n, i) => ({ ...n, id: `timesound_${i}` })),
    ];
  };

  // Returns (and caches) a sorted copy of all notes for efficient scheduling.
  const getSortedNotes = () => {
    if (!sortedNotesCache) {
      sortedNotesCache = getActiveNotesForPlayback().sort((a, b) => a.startTime - b.startTime);
    }
    return sortedNotesCache;
  };

  const scheduleNotesInWindow = (currentPlaybackTimeMs: number): void => {
    const context = audioContext.value;
    if (!context || !isPlaying.value) return;

    const allNotes = getSortedNotes();
    const lookAheadWindowMs = 2000; // 2 seconds look-ahead
    const endWindowMs = currentPlaybackTimeMs + lookAheadWindowMs;
    // Cache these refs once for the loop body to avoid repeated .value proxy accesses
    const buffers = audioBuffers.value;
    const pattern = configuredPattern.value;

    // Advance the pointer past notes that are too old to schedule
    while (schedulePointer < allNotes.length && allNotes[schedulePointer].startTime < currentPlaybackTimeMs - 50) {
      schedulePointer++;
    }

    // Schedule all notes within the look-ahead window starting from the pointer
    for (let idx = schedulePointer; idx < allNotes.length; idx++) {
      const note = allNotes[idx];
      if (note.startTime > endWindowMs) break; // Sorted, so we can stop early
      if (scheduledNoteIds.has(note.id)) continue; // Already scheduled

      const buffer = buffers[note.hitSound];
      if (!buffer) continue;

      let panningValue = note.pan !== undefined ? note.pan : 0.0;
      if (note.key !== undefined && pattern) {
        const visualColumn = pattern.indexOf(note.key.toString());
        if (visualColumn !== -1) {
          panningValue = (visualColumn - 3) / 3;
        }
      }

      const sourceNode = context.createBufferSource();
      sourceNode.buffer = buffer;

      const gainNode = context.createGain();
      gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;

      // hasStereoPane is cached once at playback start
      if (hasStereoPane) {
        const pannerNode = (context as any).createStereoPanner() as StereoPannerNode;
        pannerNode.pan.value = panningValue;
        sourceNode.connect(pannerNode).connect(gainNode).connect(masterGainNode!);
      } else {
        sourceNode.connect(gainNode).connect(masterGainNode!);
      }

      const delaySeconds = (note.startTime - currentPlaybackTimeMs) / 1000;
      const targetTime = context.currentTime + Math.max(0, delaySeconds);

      sourceNode.start(targetTime);
      activeAudioSources.push(sourceNode);
      scheduledNoteIds.add(note.id);
    }
  };

  const startPlayheadAnimation = (): void => {
    stopPlayheadAnimation();
    let frameCount = 0;
    // Capture totalDurationMs once — it won't change during a single playback session
    const totalDurationMs = cachedTotalDurationMs;
    
    const updateLoop = () => {
      if (!isPlaying.value || !audioContext.value) {
        return;
      }

      const elapsedMs = (audioContext.value.currentTime - startTimeOfPlayback) * 1000;

      if (elapsedMs >= totalDurationMs) {
        isPlaying.value = false;
        seekOffset.value = totalDurationMs;
        stopAllAudio();
        stopPlayheadAnimation();
        if (onPlayheadTick) {
          onPlayheadTick(totalDurationMs);
        }
        return;
      }

      seekOffset.value = elapsedMs;
      scheduleNotesInWindow(elapsedMs);

      // Performance: prune ended audio source nodes every 120 frames (~2s at 60fps)
      frameCount++;
      if (frameCount % 120 === 0) {
        activeAudioSources = activeAudioSources.filter((node) => {
          try { return node.buffer !== null; } catch { return false; }
        });
      }

      if (onPlayheadTick) {
        onPlayheadTick(elapsedMs);
      }
      playheadAnimationFrameId = requestAnimationFrame(updateLoop);
    };

    playheadAnimationFrameId = requestAnimationFrame(updateLoop);
  };

  const startAudioPlayback = (startTimeMs: number): void => {
    const context = initAudioContext();
    stopAllAudio();
    scheduledNoteIds.clear();
    // Reset the schedule pointer so we re-scan from the correct position
    schedulePointer = 0;

    // Cache total duration and panner availability once for the whole playback session
    const selectedDifficulty = useSelectedDifficulty();
    const fallbackDurationSec = chartData.value?.header?.difficulty?.[selectedDifficulty.value]?.duration || 0;
    cachedTotalDurationMs = getChartDurationMs() || fallbackDurationSec * 1000;
    hasStereoPane = typeof (context as any).createStereoPanner === 'function';

    isPlaying.value = true;
    seekOffset.value = startTimeMs;
    startTimeOfPlayback = context.currentTime - startTimeMs / 1000;

    // Cache for use in the overlap loop below
    const buffers = audioBuffers.value;
    const pattern = configuredPattern.value;

    // Process overlapping sounds that started before the seek point but are still active
    const allNotes = getSortedNotes();
    for (const note of allNotes) {
      const buffer = buffers[note.hitSound];
      if (!buffer) continue;

      const soundDurationMs = buffer.duration * 1000;
      if (note.startTime <= startTimeMs && note.startTime + soundDurationMs > startTimeMs) {
        let panningValue = note.pan !== undefined ? note.pan : 0.0;
        if (note.key !== undefined && pattern) {
          const visualColumn = pattern.indexOf(note.key.toString());
          if (visualColumn !== -1) {
            panningValue = (visualColumn - 3) / 3;
          }
        }

        const offsetSeconds = (startTimeMs - note.startTime) / 1000;
        const sourceNode = context.createBufferSource();
        sourceNode.buffer = buffer;

        const gainNode = context.createGain();
        gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;

        if (hasStereoPane) {
          const pannerNode = (context as any).createStereoPanner() as StereoPannerNode;
          pannerNode.pan.value = panningValue;
          sourceNode.connect(pannerNode).connect(gainNode).connect(masterGainNode!);
        } else {
          sourceNode.connect(gainNode).connect(masterGainNode!);
        }

        sourceNode.start(context.currentTime, offsetSeconds);
        activeAudioSources.push(sourceNode);
        scheduledNoteIds.add(note.id);
      }
    }

    // Advance pointer past notes already handled (before the seek point)
    const sortedNotes = getSortedNotes();
    schedulePointer = 0;
    while (schedulePointer < sortedNotes.length && sortedNotes[schedulePointer].startTime < startTimeMs - 50) {
      schedulePointer++;
    }
    scheduleNotesInWindow(startTimeMs);
    startPlayheadAnimation();
  };

  const pauseAudioPlayback = (): void => {
    if (!isPlaying.value) {
      return;
    }
    isPlaying.value = false;

    if (audioContext.value) {
      seekOffset.value = (audioContext.value.currentTime - startTimeOfPlayback) * 1000;
    }

    stopAllAudio();
    stopPlayheadAnimation();
  };

  const stopSong = (): void => {
    isPlaying.value = false;
    seekOffset.value = 0;
    stopAllAudio();
    stopPlayheadAnimation();
    if (onPlayheadTick) {
      onPlayheadTick(0);
    }
  };

  const seekTo = (targetTimeMs: number): void => {
    seekOffset.value = targetTimeMs;
    if (isPlaying.value) {
      startAudioPlayback(targetTimeMs);
    } else {
      if (onPlayheadTick) {
        onPlayheadTick(targetTimeMs);
      }
    }
  };

  const togglePlay = (): void => {
    if (isPlaying.value) {
      pauseAudioPlayback();
      return;
    }
    startAudioPlayback(seekOffset.value);
  };

  watch(volumeLevel, (newVolume) => {
    if (masterGainNode) {
      if (audioContext.value) {
        masterGainNode.gain.setTargetAtTime(newVolume, audioContext.value.currentTime, 0.05);
      } else {
        masterGainNode.gain.value = newVolume;
      }
    }
  });

  onUnmounted(() => {
    stopPlayheadAnimation();
    stopAllAudio();
    if (audioContext.value) {
      audioContext.value.close();
    }
  });

  return {
    isPlaying,
    seekOffset,
    isDecoding,
    decodingProgress,
    decodingTotal,
    volumeLevel,
    decodeAllSounds,
    getChartDurationMs,
    startAudioPlayback,
    pauseAudioPlayback,
    stopSong,
    seekTo,
    togglePlay,
  };
}
