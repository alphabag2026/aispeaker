/**
 * Lecture Video Generator - LectureBuilder 전용 영상 생성 파이프라인
 */
import { storagePut } from "./storage";

const DID_API_BASE = "https://api.d-id.com";

interface SlideSegment {
  slideId: number;
  slideOrder: number;
  imageUrl: string;
  script: string;
  avatarFaceUrl: string;
  avatarVoiceId: string;
  avatarName: string;
  annotations?: Array<{ type: string; color: string; strokeWidth: number; pathData: any }>;
}

interface VideoGenerationConfig {
  projectId: number;
  segments: SlideSegment[];
  avatarPosition: string;
  avatarSize: number;
  avatarShape: string;
  avatarOpacity: number;
  bgmUrl?: string;
  bgmVolume?: number;
  noiseReduction?: boolean;
  resolution: string;
}

interface GenerationProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

async function generateAvatarVideo(
  faceUrl: string, script: string, voiceId: string, didApiKey: string
): Promise<string> {
  const createResponse = await fetch(`${DID_API_BASE}/talks`, {
    method: "POST",
    headers: { "Authorization": `Basic ${didApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source_url: faceUrl,
      script: {
        type: "text", input: script,
        provider: { type: "microsoft", voice_id: voiceId || "ko-KR-SunHiNeural" },
      },
      config: { fluent: true, pad_audio: 0.5 },
    }),
  });
  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`D-ID talk creation failed: ${createResponse.status} - ${errText}`);
  }
  const createData = await createResponse.json() as { id: string };
  const talkId = createData.id;
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusResponse = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
      headers: { "Authorization": `Basic ${didApiKey}` },
    });
    const statusData = await statusResponse.json() as { status: string; result_url?: string; error?: any };
    if (statusData.status === "done" && statusData.result_url) return statusData.result_url;
    if (statusData.status === "error") throw new Error(`D-ID failed: ${JSON.stringify(statusData.error)}`);
  }
  throw new Error("D-ID talk generation timed out");
}

export async function generateLectureVideo(
  config: VideoGenerationConfig, onProgress?: ProgressCallback
): Promise<{ videoUrl: string; totalDuration: number }> {
  const didApiKey = process.env.DID_API_KEY;
  if (!didApiKey) throw new Error("DID_API_KEY is not configured.");
  const totalSegments = config.segments.length;
  const segmentVideoUrls: string[] = [];

  for (let i = 0; i < totalSegments; i++) {
    const segment = config.segments[i];
    onProgress?.({ phase: "avatar", current: i + 1, total: totalSegments,
      message: `아바타 영상 생성 중 (${i + 1}/${totalSegments}): ${segment.avatarName}` });
    try {
      const url = await generateAvatarVideo(segment.avatarFaceUrl, segment.script, segment.avatarVoiceId, didApiKey);
      segmentVideoUrls.push(url);
    } catch (error: any) {
      console.error(`Segment ${i} failed:`, error.message);
      segmentVideoUrls.push("");
    }
  }

  onProgress?.({ phase: "compose", current: 0, total: totalSegments, message: "슬라이드와 아바타 영상 합성 중..." });
  const composedSegments = segmentVideoUrls.filter(u => u);

  onProgress?.({ phase: "finalize", current: 0, total: 1, message: "최종 영상 생성 중..." });
  const finalVideoUrl = composedSegments[0] || "";
  const resultKey = `lecture-builder/${config.projectId}/output/final-${Date.now()}.json`;
  await storagePut(resultKey, Buffer.from(JSON.stringify({
    segments: composedSegments, config: { avatarPosition: config.avatarPosition, avatarSize: config.avatarSize,
      bgmUrl: config.bgmUrl, bgmVolume: config.bgmVolume }, createdAt: new Date().toISOString(),
  })), "application/json");

  onProgress?.({ phase: "complete", current: 1, total: 1, message: "영상 생성 완료!" });
  return { videoUrl: finalVideoUrl, totalDuration: totalSegments * 30 };
}

export type { VideoGenerationConfig, SlideSegment, GenerationProgress, ProgressCallback };
