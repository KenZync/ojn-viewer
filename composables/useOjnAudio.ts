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

  const startPlayheadAnimation = (): void => {
    stopPlayheadAnimation();
    
    const updateLoop = () => {
      if (!isPlaying.value || !audioContext.value) {
        return;
      }

      const elapsedMs = (audioContext.value.currentTime - startTimeOfPlayback) * 1000;
      const selectedDifficulty = useSelectedDifficulty();
      const fallbackDurationSec = chartData.value?.header?.difficulty?.[selectedDifficulty.value]?.duration || 0;
      const totalDurationMs = getChartDurationMs() || fallbackDurationSec * 1000;

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

    isPlaying.value = true;
    seekOffset.value = startTimeMs;
    startTimeOfPlayback = context.currentTime - startTimeMs / 1000;

    const hardData = chartData.value?.hard;
    if (!hardData) {
      return;
    }

    const allChartNotes = [
      ...(hardData.notes || []),
      ...(hardData.timeSounds || []),
    ];

    for (const note of allChartNotes) {
      const buffer = audioBuffers.value[note.hitSound];
      if (!buffer) {
        continue;
      }

      // Calculate panning
      let panningValue = note.pan !== undefined ? note.pan : 0.0;
      if (note.key !== undefined && configuredPattern.value) {
        const visualColumn = configuredPattern.value.indexOf(note.key.toString());
        if (visualColumn !== -1) {
          panningValue = (visualColumn - 3) / 3; // map 7 keys to [-1.0, 1.0]
        }
      }

      // 1. Future Notes
      if (note.startTime >= startTimeMs) {
        const sourceNode = context.createBufferSource();
        sourceNode.buffer = buffer;

        const gainNode = context.createGain();
        gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;

        const pannerNode = context.createStereoPanner ? context.createStereoPanner() : null;
        if (pannerNode) {
          pannerNode.pan.value = panningValue;
          sourceNode.connect(pannerNode).connect(gainNode).connect(masterGainNode!);
        } else {
          sourceNode.connect(gainNode).connect(masterGainNode!);
        }

        const scheduledTimeSec = startTimeOfPlayback + note.startTime / 1000;
        sourceNode.start(scheduledTimeSec);
        activeAudioSources.push(sourceNode);
      }
      // 2. Overlapping / Seek Context Notes
      else {
        const soundDurationMs = buffer.duration * 1000;
        if (note.startTime + soundDurationMs > startTimeMs) {
          const offsetSeconds = (startTimeMs - note.startTime) / 1000;
          const sourceNode = context.createBufferSource();
          sourceNode.buffer = buffer;

          const gainNode = context.createGain();
          gainNode.gain.value = note.volume !== undefined ? note.volume : 1.0;

          const pannerNode = context.createStereoPanner ? context.createStereoPanner() : null;
          if (pannerNode) {
            pannerNode.pan.value = panningValue;
            sourceNode.connect(pannerNode).connect(gainNode).connect(masterGainNode!);
          } else {
            sourceNode.connect(gainNode).connect(masterGainNode!);
          }

          sourceNode.start(context.currentTime, offsetSeconds);
          activeAudioSources.push(sourceNode);
        }
      }
    }

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
