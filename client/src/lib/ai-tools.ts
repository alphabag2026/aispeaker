export const TOOL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  "image-to-video": { label: "Image to Video", icon: "🎬", color: "text-violet-400" },
  "text-to-video": { label: "Text to Video", icon: "📝", color: "text-blue-400" },
  "face-swap": { label: "Face Swap", icon: "🔄", color: "text-pink-400" },
  "avatar": { label: "Talking Avatar", icon: "🤖", color: "text-cyan-400" },
  "translate": { label: "Video Translation", icon: "🌐", color: "text-amber-400" },
  "tts": { label: "Text to Speech", icon: "🔊", color: "text-emerald-400" },
  "voice-clone": { label: "Voice Clone", icon: "🎤", color: "text-purple-400" },
  "image-gen": { label: "Image Generation", icon: "🖼️", color: "text-rose-400" },
};

export function getToolLabel(toolId: string): string {
  return TOOL_LABELS[toolId]?.label || toolId;
}
