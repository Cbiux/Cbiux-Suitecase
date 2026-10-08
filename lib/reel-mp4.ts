import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
} from "mediabunny";

const QUALITY = new Quality("high");

export async function encodeReelMp4(options: {
  canvas: HTMLCanvasElement;
  draw: (t: number) => void;
  seconds: number;
  fps: number;
  audio?: AudioBuffer | null;
  onProgress?: (ratio: number) => void;
}) {
  const { canvas, draw, seconds, fps, audio, onProgress } = options;
  const width = canvas.width;
  const height = canvas.height;
  const avcOk = await canEncodeVideo("avc", { width, height, quality: QUALITY, frameRate: fps });
  if (!avcOk) throw new Error("ENCODER");

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    quality: QUALITY,
    latencyMode: "quality",
    keyFrameInterval: 2,
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource: AudioBufferSource | null = null;
  let audioCodec: AudioCodec | null = null;
  if (audio && audio.length > 0) {
    if (await canEncodeAudio("aac", { numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate, quality: QUALITY })) {
      audioCodec = "aac";
    } else if (await canEncodeAudio("opus", { numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate, quality: QUALITY })) {
      audioCodec = "opus";
    }
    if (audioCodec) {
      audioSource = new AudioBufferSource({ codec: audioCodec, quality: QUALITY });
      output.addAudioTrack(audioSource);
    }
  }

  try {
    await output.start();
    if (audioSource && audio) await audioSource.add(audio);
    audioSource?.close();

    const total = Math.max(1, Math.round(seconds * fps));
    const frameDur = 1 / fps;
    for (let index = 0; index < total; index += 1) {
      draw(Math.min(seconds, index * frameDur));
      await videoSource.add(index * frameDur, frameDur);
      if (index % 8 === 0 || index === total - 1) {
        onProgress?.((index + 1) / total);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }
    }
    videoSource.close();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }

  if (!target.buffer) throw new Error("ENCODER");
  return new Blob([target.buffer], { type: "video/mp4" });
}
