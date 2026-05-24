// Shared types and constants for LectureBuilder
import { Users, FileText, Image, Layers, Eye, Circle, ArrowUpRight, CheckSquare, PenTool, Pencil, Eraser } from "lucide-react";

export interface ScriptSection {
  id: string;
  section: number;
  text: string;
  avatarId?: number;
}

export interface AnnotationData {
  type: "circle" | "arrow" | "check" | "underline" | "freehand";
  color: string;
  thickness: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: {x: number; y: number;}[];
}

export const getSTEPS = (t: (k: string) => string) => [
  { id: 1, title: t("lectureBuilder.stringLiteral0"), icon: Users, desc: t("lectureBuilder.stringLiteral1") },
  { id: 2, title: t("lectureBuilder.stringLiteral2"), icon: FileText, desc: t("lectureBuilder.stringLiteral3") },
  { id: 3, title: t("lectureBuilder.stringLiteral4"), icon: Image, desc: t("lectureBuilder.stringLiteral5") },
  { id: 4, title: t("lectureBuilder.stringLiteral6"), icon: Layers, desc: t("lectureBuilder.stringLiteral7") },
  { id: 5, title: t("lectureBuilder.stringLiteral8"), icon: Eye, desc: t("lectureBuilder.stringLiteral9") },
];

export const getAVATAR_ROLES = (t: (k: string) => string) => [
  { value: "instructor", label: t("lectureBuilder.stringLiteral10"), color: "bg-blue-500/20 text-blue-400" },
  { value: "host", label: t("lectureBuilder.stringLiteral11"), color: "bg-purple-500/20 text-purple-400" },
  { value: "guest", label: t("lectureBuilder.stringLiteral12"), color: "bg-green-500/20 text-green-400" },
  { value: "narrator", label: t("lectureBuilder.stringLiteral13"), color: "bg-orange-500/20 text-orange-400" },
];

export const getANNOTATION_TOOLS = (t: (k: string) => string) => [
  { type: "circle" as const, icon: Circle, label: t("lectureBuilder.stringLiteral14") },
  { type: "arrow" as const, icon: ArrowUpRight, label: t("lectureBuilder.stringLiteral15") },
  { type: "check" as const, icon: CheckSquare, label: t("lectureBuilder.stringLiteral16") },
  { type: "underline" as const, icon: PenTool, label: t("lectureBuilder.stringLiteral17") },
  { type: "freehand" as const, icon: Pencil, label: t("lectureBuilder.stringLiteral18") },
  { type: "eraser" as const, icon: Eraser, label: t("lectureBuilder.stringLiteral19") },
];

export const PEN_COLORS = ["#FF0000", "#00FF00", "#0066FF", "#FFFF00", "#FF6600", "#FF00FF", "#FFFFFF"];
