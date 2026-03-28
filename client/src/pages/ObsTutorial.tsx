import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ArrowLeft, Monitor, Camera, Mic, Settings, Download, Play,
  CheckCircle2, AlertTriangle, ExternalLink, Layers, Volume2,
  UserCircle2, Video, Wifi, ChevronRight, Info
} from "lucide-react";

const steps = {
  obs: [
    {
      title: "1. OBS Studio 설치",
      icon: Download,
      content: `OBS Studio는 무료 오픈소스 방송/녹화 소프트웨어입니다.`,
      details: [
        "공식 사이트(obsproject.com)에서 OS에 맞는 버전을 다운로드합니다.",
        "Windows, macOS, Linux 모두 지원합니다.",
        "설치 후 처음 실행하면 자동 설정 마법사가 나타납니다.",
        "\"녹화 최적화\"를 선택하세요 (스트리밍이 아닌 가상 카메라 용도).",
      ],
      tip: "최신 버전(v30+)에서는 가상 카메라 기능이 기본 내장되어 있어 별도 플러그인이 필요 없습니다.",
    },
    {
      title: "2. 소스 구성하기",
      icon: Layers,
      content: `강의에 필요한 소스들을 OBS 씬에 추가합니다.`,
      details: [
        "\"소스\" 패널에서 + 버튼을 클릭합니다.",
        "\"브라우저 소스\"를 추가하고, 우리 플랫폼의 강의실 URL을 입력합니다.",
        "\"윈도우 캡처\" 또는 \"디스플레이 캡처\"로 PPT 슬라이드를 추가할 수 있습니다.",
        "\"이미지\"로 로고나 워터마크를 오버레이할 수 있습니다.",
        "소스의 크기와 위치를 드래그하여 레이아웃을 구성합니다.",
      ],
      tip: "브라우저 소스의 해상도는 1920x1080으로 설정하면 최적의 화질을 얻을 수 있습니다.",
    },
    {
      title: "3. 딥페이크 아바타 연동",
      icon: UserCircle2,
      content: `AI 아바타 영상을 OBS에서 실시간으로 사용합니다.`,
      details: [
        "플랫폼에서 딥페이크 프로필을 먼저 설정합니다 (강사 대시보드 → 딥페이크 관리).",
        "강의실에서 아바타 모드를 활성화합니다.",
        "OBS에서 \"브라우저 소스\"로 강의실 URL을 추가하면 아바타가 표시됩니다.",
        "또는 D-ID API를 사용하는 경우, 생성된 아바타 영상을 \"미디어 소스\"로 추가합니다.",
        "크로마키(녹색 배경) 필터를 적용하면 아바타만 깔끔하게 추출할 수 있습니다.",
      ],
      tip: "D-ID API 키를 설정하면 실시간 아바타 영상 생성이 가능합니다. 설정 → API 키에서 입력하세요.",
    },
    {
      title: "4. 음성 변조 설정",
      icon: Volume2,
      content: `변조된 음성을 OBS를 통해 출력합니다.`,
      details: [
        "플랫폼에서 음성 변조 프로필을 설정합니다 (강사 대시보드 → 음성 변조).",
        "원클릭 스튜디오에서 음성 변조가 적용된 TTS 음성을 생성합니다.",
        "OBS에서 \"미디어 소스\"로 생성된 음성 파일을 추가합니다.",
        "또는 실시간 변조를 위해 VB-Audio Virtual Cable을 설치합니다.",
        "OBS 오디오 설정에서 가상 오디오 장치를 입력으로 선택합니다.",
      ],
      tip: "VB-Audio Virtual Cable(무료)을 사용하면 플랫폼의 TTS 출력을 OBS에 직접 라우팅할 수 있습니다.",
    },
    {
      title: "5. 가상 카메라 시작",
      icon: Camera,
      content: `OBS의 가상 카메라를 활성화하여 외부 플랫폼에서 사용합니다.`,
      details: [
        "OBS 하단의 \"가상 카메라 시작\" 버튼을 클릭합니다.",
        "이제 OBS의 출력이 가상 웹캠으로 인식됩니다.",
        "Zoom, Google Meet, Webex 등에서 카메라를 \"OBS Virtual Camera\"로 선택합니다.",
        "마이크도 가상 오디오 장치로 변경하면 변조된 음성이 전달됩니다.",
        "상대방에게는 딥페이크 아바타 + 변조된 음성으로 보이게 됩니다.",
      ],
      tip: "가상 카메라가 목록에 안 보이면 OBS를 관리자 권한으로 실행해보세요.",
    },
  ],
  zoom: [
    {
      title: "Zoom에서 사용하기",
      icon: Video,
      details: [
        "Zoom 앱을 실행하고 회의에 참가합니다.",
        "설정(⚙️) → 비디오 → 카메라에서 \"OBS Virtual Camera\"를 선택합니다.",
        "설정 → 오디오 → 마이크에서 가상 오디오 장치를 선택합니다.",
        "\"원본 사운드 켜기\"를 활성화하면 Zoom의 노이즈 제거가 비활성화되어 변조된 음성이 더 자연스럽게 전달됩니다.",
        "화면 공유 시 OBS의 특정 씬을 공유할 수도 있습니다.",
      ],
    },
    {
      title: "Google Meet에서 사용하기",
      icon: Video,
      details: [
        "Chrome 브라우저에서 Google Meet에 접속합니다.",
        "회의 참가 전 카메라 설정에서 \"OBS Virtual Camera\"를 선택합니다.",
        "마이크 설정에서 가상 오디오 장치를 선택합니다.",
        "Chrome의 사이트 설정에서 카메라/마이크 권한이 허용되어 있는지 확인합니다.",
        "Meet의 \"노이즈 캔슬링\" 기능은 끄는 것을 권장합니다.",
      ],
    },
    {
      title: "Webex에서 사용하기",
      icon: Video,
      details: [
        "Webex 앱에서 설정 → 비디오에서 \"OBS Virtual Camera\"를 선택합니다.",
        "오디오 설정에서 마이크를 가상 오디오 장치로 변경합니다.",
        "Webex의 배경 흐림/가상 배경 기능은 OBS 가상 카메라와 함께 사용할 수 있습니다.",
      ],
    },
    {
      title: "Tencent Meeting에서 사용하기",
      icon: Video,
      details: [
        "텐센트 회의 앱에서 설정 → 비디오에서 \"OBS Virtual Camera\"를 선택합니다.",
        "오디오 입력 장치를 가상 오디오 장치로 변경합니다.",
        "미용 필터와 함께 사용하면 아바타가 더 자연스러워질 수 있습니다.",
      ],
    },
  ],
};

export default function ObsTutorial() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-broadcast-VqgzPLgr6PKLpmSfakoS73.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <div className="flex items-center gap-3 mb-3">
              <Link href="/instructor">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20"><ArrowLeft className="w-4 h-4 mr-1" /> 대시보드</Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">OBS 가상 카메라 튜토리얼</h1>
                <p className="text-white/70 mt-1">딟페이크 + 음성 변조가 적용된 강의를 Zoom, Google Meet 등에서 사용하는 방법</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Overview */}
        <Card className="mb-8 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 border-green-500/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              {[
                { icon: Settings, label: "OBS 설정", desc: "소스 구성" },
                { icon: UserCircle2, label: "딥페이크 적용", desc: "아바타 연동" },
                { icon: Mic, label: "음성 변조", desc: "가상 오디오" },
                { icon: Camera, label: "가상 카메라", desc: "OBS → 웹캠" },
                { icon: Video, label: "외부 플랫폼", desc: "Zoom/Meet 연결" },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-2">
                      <step.icon className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-xs font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{step.desc}</span>
                  </div>
                  {i < 4 && <ChevronRight className="w-5 h-5 text-muted-foreground mx-2 mt-[-20px]" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <Card className="mb-8 border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400"><AlertTriangle className="w-5 h-5" /> 사전 준비 사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Download className="w-4 h-4 text-green-400" />필수 소프트웨어</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• OBS Studio v30+ (obsproject.com)</li>
                  <li>• VB-Audio Virtual Cable (선택)</li>
                  <li>• Zoom / Google Meet / Webex 앱</li>
                </ul>
              </div>
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-violet-400" />플랫폼 설정</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 딥페이크 프로필 생성 완료</li>
                  <li>• 음성 변조 프로필 설정 완료</li>
                  <li>• (선택) D-ID API 키 등록</li>
                </ul>
              </div>
              <div className="p-4 bg-card/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2"><Wifi className="w-4 h-4 text-blue-400" />시스템 요구사항</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 안정적인 인터넷 연결</li>
                  <li>• 웹캠 (딥페이크 실시간 모드)</li>
                  <li>• 마이크 (음성 입력용)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="obs">
          <TabsList className="mb-6">
            <TabsTrigger value="obs"><Monitor className="w-4 h-4 mr-2" />OBS 설정 가이드</TabsTrigger>
            <TabsTrigger value="platforms"><Video className="w-4 h-4 mr-2" />외부 플랫폼 연동</TabsTrigger>
            <TabsTrigger value="tips"><Info className="w-4 h-4 mr-2" />고급 팁</TabsTrigger>
          </TabsList>

          <TabsContent value="obs">
            <div className="space-y-6">
              {steps.obs.map((step, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <step.icon className="w-5 h-5 text-green-400" />
                      </div>
                      {step.title}
                    </CardTitle>
                    <CardDescription>{step.content}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {step.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                    {step.tip && (
                      <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-sm text-green-300 flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 shrink-0" />
                          <span><strong>팁:</strong> {step.tip}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="platforms">
            <div className="space-y-6">
              {steps.zoom.map((platform, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <platform.icon className="w-5 h-5 text-blue-400" />
                      </div>
                      {platform.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {platform.details.map((detail, j) => (
                        <div key={j} className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 shrink-0">{j + 1}</span>
                          <span className="text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tips">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">화질 최적화</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• OBS 출력 해상도를 1920x1080으로 설정하세요.</p>
                  <p>• 비트레이트는 2500-4000 Kbps가 적당합니다.</p>
                  <p>• 프레임레이트는 30fps로 설정하세요 (60fps는 불필요).</p>
                  <p>• 인코더는 하드웨어 인코더(NVENC/AMF)를 우선 사용하세요.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">음성 품질 향상</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• 외부 플랫폼의 노이즈 캔슬링을 끄세요 (변조 음성 왜곡 방지).</p>
                  <p>• OBS에서 오디오 필터(노이즈 게이트, 컴프레서)를 추가하세요.</p>
                  <p>• 샘플레이트는 48kHz로 설정하세요.</p>
                  <p>• 마이크 입력 레벨은 -12dB ~ -6dB 사이가 적당합니다.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">딥페이크 자연스러움 향상</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• 조명을 균일하게 설정하세요 (얼굴에 그림자가 없도록).</p>
                  <p>• 배경은 단색이 좋습니다 (크로마키 사용 시 녹색).</p>
                  <p>• 카메라를 눈높이에 맞추세요.</p>
                  <p>• 급격한 머리 움직임은 피하세요.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">트러블슈팅</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>• 가상 카메라가 안 보이면 OBS를 재시작하세요.</p>
                  <p>• macOS에서는 OBS에 카메라 권한을 부여해야 합니다.</p>
                  <p>• 브라우저 소스가 검은 화면이면 하드웨어 가속을 끄세요.</p>
                  <p>• CPU 사용률이 높으면 해상도를 1280x720으로 낮추세요.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>관련 설정 바로가기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/instructor/faceswap"><Button variant="outline"><UserCircle2 className="w-4 h-4 mr-2" />딥페이크 관리</Button></Link>
              <Link href="/instructor/voicemod"><Button variant="outline"><Mic className="w-4 h-4 mr-2" />음성 변조 관리</Button></Link>
              <Link href="/instructor/platforms"><Button variant="outline"><Video className="w-4 h-4 mr-2" />외부 플랫폼 연동</Button></Link>
              <Link href="/studio"><Button variant="outline"><Play className="w-4 h-4 mr-2" />원클릭 스튜디오</Button></Link>
              <a href="https://obsproject.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />OBS 다운로드</Button>
              </a>
              <a href="https://vb-audio.com/Cable/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />VB-Audio Cable</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
