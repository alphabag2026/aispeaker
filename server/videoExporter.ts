/**
 * Video Exporter - 강의 영상 MP4 내보내기 모듈
 * ffmpeg를 사용하여 슬라이드 이미지 + 아바타 영상 + BGM을 합성하여 최종 MP4 생성
 */
import ffmpeg from "fluent-ffmpeg";
import { storagePut } from "./storage";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { nanoid } from "nanoid";

export interface ExportSegment {
  slideImageUrl: string;
  avatarVideoUrl?: string;
  duration: number; // seconds
  scriptText?: string;
}

export interface ExportConfig {
  projectId: number;
  segments: ExportSegment[];
  bgmUrl?: string;
  bgmVolume?: number; // 0-100
  resolution: "720p" | "1080p" | "1440p";
  avatarPosition: string;
  avatarSize: number; // percentage
  avatarShape: string;
  avatarOpacity: number; // 0-100
  includeSubtitles?: boolean;
}

export interface ExportProgress {
  phase: "download" | "compose" | "merge" | "upload" | "complete";
  progress: number; // 0-100
  message: string;
}

type ExportProgressCallback = (progress: ExportProgress) => void;

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "1440p": { width: 2560, height: 1440 },
};

/**
 * Download a file from URL to a local temp path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url} (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

/**
 * Create a video segment from a slide image with specified duration
 */
function createSlideVideo(
  imagePath: string,
  outputPath: string,
  duration: number,
  resolution: { width: number; height: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop(duration)
      .inputOptions(["-framerate", "1"])
      .outputOptions([
        "-c:v", "libx264",
        "-t", String(duration),
        "-pix_fmt", "yuv420p",
        "-vf", `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:black`,
        "-r", "30",
        "-preset", "ultrafast",
        "-tune", "stillimage",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`Slide video creation failed: ${err.message}`)))
      .run();
  });
}

/**
 * Overlay avatar video on slide video using PIP
 */
function overlayAvatarPIP(
  slideVideoPath: string,
  avatarVideoPath: string,
  outputPath: string,
  position: string,
  sizePct: number,
  shape: string,
  opacity: number,
  resolution: { width: number; height: number }
): Promise<void> {
  const avatarW = Math.round(resolution.width * sizePct / 100);
  const avatarH = Math.round(resolution.height * sizePct / 100);
  const margin = 30;

  let x: number, y: number;
  switch (position) {
    case "bottom-left": x = margin; y = resolution.height - avatarH - margin; break;
    case "top-right": x = resolution.width - avatarW - margin; y = margin; break;
    case "top-left": x = margin; y = margin; break;
    default: x = resolution.width - avatarW - margin; y = resolution.height - avatarH - margin; break;
  }

  const opacityVal = opacity / 100;
  let filterComplex = `[1:v]scale=${avatarW}:${avatarH}`;
  
  if (shape === "circle") {
    filterComplex += `,format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${avatarW}/2,2)+pow(Y-${avatarH}/2,2),pow(min(${avatarW},${avatarH})/2,2)),255*${opacityVal},0)'`;
  } else if (shape === "rounded") {
    filterComplex += `,format=rgba,colorchannelmixer=aa=${opacityVal}`;
  } else {
    filterComplex += `,format=rgba,colorchannelmixer=aa=${opacityVal}`;
  }
  
  filterComplex += `[avatar];[0:v][avatar]overlay=${x}:${y}:shortest=1[out]`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(slideVideoPath)
      .input(avatarVideoPath)
      .complexFilter(filterComplex)
      .outputOptions([
        "-map", "[out]",
        "-map", "1:a?",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "ultrafast",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`PIP overlay failed: ${err.message}`)))
      .run();
  });
}

/**
 * Concatenate multiple video segments into one
 */
function concatenateVideos(
  inputPaths: string[],
  outputPath: string,
  listFilePath: string
): Promise<void> {
  // Create concat file
  const content = inputPaths.map(p => `file '${p}'`).join("\n");
  fs.writeFileSync(listFilePath, content);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFilePath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions([
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "fast",
        "-movflags", "+faststart",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`Concatenation failed: ${err.message}`)))
      .run();
  });
}

/**
 * Add BGM audio to the final video
 */
function addBGM(
  videoPath: string,
  bgmPath: string,
  outputPath: string,
  bgmVolume: number // 0-100
): Promise<void> {
  const vol = bgmVolume / 100;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(bgmPath)
      .complexFilter([
        `[0:a]volume=1.0[voice]`,
        `[1:a]volume=${vol},aloop=loop=-1:size=2e+09[bgm]`,
        `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
      ].join(";"))
      .outputOptions([
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-movflags", "+faststart",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(new Error(`BGM addition failed: ${err.message}`)))
      .run();
  });
}

/**
 * Main export function - generates final MP4 from lecture segments
 */
export async function exportLectureVideo(
  config: ExportConfig,
  onProgress?: ExportProgressCallback
): Promise<{ videoUrl: string; fileSize: number; duration: number }> {
  const tmpDir = path.join(os.tmpdir(), `lecture-export-${nanoid(8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const resolution = RESOLUTION_MAP[config.resolution] || RESOLUTION_MAP["1080p"];
  const segmentPaths: string[] = [];

  try {
    // Phase 1: Download assets
    onProgress?.({ phase: "download", progress: 0, message: "에셋 다운로드 중..." });
    
    for (let i = 0; i < config.segments.length; i++) {
      const seg = config.segments[i];
      const slideImgPath = path.join(tmpDir, `slide-${i}.jpg`);
      await downloadFile(seg.slideImageUrl, slideImgPath);
      
      if (seg.avatarVideoUrl) {
        const avatarPath = path.join(tmpDir, `avatar-${i}.mp4`);
        await downloadFile(seg.avatarVideoUrl, avatarPath);
      }
      
      const dlProgress = Math.round(((i + 1) / config.segments.length) * 20);
      onProgress?.({ phase: "download", progress: dlProgress, message: `에셋 다운로드 중 (${i + 1}/${config.segments.length})...` });
    }

    // Phase 2: Compose individual segments
    onProgress?.({ phase: "compose", progress: 20, message: "세그먼트 합성 중..." });
    
    for (let i = 0; i < config.segments.length; i++) {
      const seg = config.segments[i];
      const slideImgPath = path.join(tmpDir, `slide-${i}.jpg`);
      const slideVideoPath = path.join(tmpDir, `slide-video-${i}.mp4`);
      
      // Create slide video from image
      await createSlideVideo(slideImgPath, slideVideoPath, seg.duration, resolution);
      
      let finalSegmentPath = slideVideoPath;
      
      // Overlay avatar PIP if available
      if (seg.avatarVideoUrl && config.avatarPosition !== "none") {
        const avatarPath = path.join(tmpDir, `avatar-${i}.mp4`);
        const pipPath = path.join(tmpDir, `pip-${i}.mp4`);
        
        if (fs.existsSync(avatarPath)) {
          try {
            await overlayAvatarPIP(
              slideVideoPath, avatarPath, pipPath,
              config.avatarPosition, config.avatarSize,
              config.avatarShape, config.avatarOpacity, resolution
            );
            finalSegmentPath = pipPath;
          } catch (err) {
            console.warn(`PIP overlay failed for segment ${i}, using slide only:`, err);
          }
        }
      }
      
      segmentPaths.push(finalSegmentPath);
      
      const composeProgress = 20 + Math.round(((i + 1) / config.segments.length) * 40);
      onProgress?.({ phase: "compose", progress: composeProgress, message: `세그먼트 합성 중 (${i + 1}/${config.segments.length})...` });
    }

    // Phase 3: Merge all segments
    onProgress?.({ phase: "merge", progress: 60, message: "세그먼트 병합 중..." });
    
    const concatListPath = path.join(tmpDir, "concat-list.txt");
    let mergedPath: string;
    
    if (segmentPaths.length === 1) {
      mergedPath = segmentPaths[0];
    } else {
      mergedPath = path.join(tmpDir, "merged.mp4");
      await concatenateVideos(segmentPaths, mergedPath, concatListPath);
    }

    // Add BGM if provided
    let finalPath = mergedPath;
    if (config.bgmUrl) {
      onProgress?.({ phase: "merge", progress: 75, message: "배경음악 합성 중..." });
      const bgmPath = path.join(tmpDir, "bgm.mp3");
      await downloadFile(config.bgmUrl, bgmPath);
      
      const withBgmPath = path.join(tmpDir, "final-with-bgm.mp4");
      try {
        await addBGM(mergedPath, bgmPath, withBgmPath, config.bgmVolume || 30);
        finalPath = withBgmPath;
      } catch (err) {
        console.warn("BGM addition failed, using video without BGM:", err);
      }
    }

    // Phase 4: Upload to S3
    onProgress?.({ phase: "upload", progress: 85, message: "영상 업로드 중..." });
    
    const finalBuffer = fs.readFileSync(finalPath);
    const fileSize = finalBuffer.length;
    const s3Key = `lecture-builder/${config.projectId}/export/lecture-${Date.now()}-${nanoid(6)}.mp4`;
    const { url } = await storagePut(s3Key, finalBuffer, "video/mp4");

    // Calculate total duration
    const totalDuration = config.segments.reduce((acc, s) => acc + s.duration, 0);

    onProgress?.({ phase: "complete", progress: 100, message: "내보내기 완료!" });

    return { videoUrl: url, fileSize, duration: totalDuration };
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Failed to cleanup temp dir:", e);
    }
  }
}
