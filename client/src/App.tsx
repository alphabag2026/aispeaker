import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";

// Eagerly loaded (critical path)
import Home from "./pages/Home";
import { GuideTour } from "./components/GuideTour";
import NotFound from "@/pages/NotFound";

// Lazy-loaded pages (code splitting)
const LectureList = lazy(() => import("./pages/LectureList"));
const LectureRoom = lazy(() => import("./pages/LectureRoom"));
const InstructorDashboard = lazy(() => import("./pages/InstructorDashboard"));
const InstructorLectures = lazy(() => import("./pages/InstructorLectures"));
const InstructorLectureForm = lazy(() => import("./pages/InstructorLectureForm"));
const InstructorVoiceProfiles = lazy(() => import("./pages/InstructorVoiceProfiles"));
const InstructorTemplates = lazy(() => import("./pages/InstructorTemplates"));
const InstructorFaceSwap = lazy(() => import("./pages/InstructorFaceSwap"));
const InstructorVoiceMod = lazy(() => import("./pages/InstructorVoiceMod"));
const InstructorPlatforms = lazy(() => import("./pages/InstructorPlatforms"));
const VodList = lazy(() => import("./pages/VodList"));
const VodPlayer = lazy(() => import("./pages/VodPlayer"));
const ProductionStudio = lazy(() => import("./pages/ProductionStudio"));
const ObsTutorial = lazy(() => import("./pages/ObsTutorial"));
const ScriptEditor = lazy(() => import("./pages/ScriptEditor"));
const PipelineDashboard = lazy(() => import("./pages/PipelineDashboard"));
const ScriptTemplateLibrary = lazy(() => import("./pages/ScriptTemplateLibrary"));
const PreviewPlayer = lazy(() => import("./pages/PreviewPlayer"));
const BroadcastManager = lazy(() => import("./pages/BroadcastManager"));
const BroadcastStudio = lazy(() => import("./pages/BroadcastStudio"));
const BroadcastViewer = lazy(() => import("./pages/BroadcastViewer"));
const BrowserStudio = lazy(() => import("./pages/BrowserStudio"));
const FaceGallery = lazy(() => import("./pages/FaceGallery"));
const VoiceGallery = lazy(() => import("./pages/VoiceGallery"));
const Pricing = lazy(() => import("./pages/Pricing"));
const MySubscription = lazy(() => import("./pages/MySubscription"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const AdminRevenue = lazy(() => import("./pages/AdminRevenue"));
const CryptoPayment = lazy(() => import("./pages/CryptoPayment"));
const PaymentTroubleshooting = lazy(() => import("./pages/PaymentTroubleshooting"));
const OnboardingTutorial = lazy(() => import("./pages/OnboardingTutorial"));
// import Features from "./pages/Features";
const Features = lazy(() => import("./pages/Features"));
const FeatureDetail = lazy(() => import("./pages/FeatureDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const LectureBuilder = lazy(() => import("./pages/LectureBuilder"));
const VideoHistory = lazy(() => import("./pages/VideoHistory"));
const AdminFormatTemplates = lazy(() => import("./pages/AdminFormatTemplates"));
const CommunityGallery = lazy(() => import("./pages/CommunityGallery"));
const CreditDashboard = lazy(() => import("./pages/CreditDashboard"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const AiHistory = lazy(() => import("./pages/AiHistory"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const VideoEffectsStudio = lazy(() => import("./pages/VideoEffectsStudio"));
const ScormExport = lazy(() => import("./pages/ScormExport"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MarketplaceDetail = lazy(() => import("./pages/MarketplaceDetail"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const LiveInterpretation = lazy(() => import("./pages/LiveInterpretation"));
const PresenterStudio = lazy(() => import("./pages/PresenterStudio"));

// AkoolStudio sub-pages
const AkoolStudio = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.default })));
const AkoolImageToVideo = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolImageToVideo })));
const AkoolFaceSwap = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolFaceSwap })));
const AkoolTalkingAvatar = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolTalkingAvatar })));
const AkoolVideoTranslate = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolVideoTranslate })));
const AkoolTTS = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolTTS })));
const AkoolVoiceClone = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolVoiceClone })));
const AkoolVoiceChange = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolVoiceChange })));
const AkoolImageGen = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolImageGen })));
const AkoolBgRemove = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolBgRemove })));
const AkoolLiveCamera = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolLiveCamera })));
const AkoolStreamingAvatar = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolStreamingAvatar })));
const AkoolModels = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolModels })));
const AkoolEffects = lazy(() => import("./pages/AkoolStudio").then(m => ({ default: m.AkoolEffects })));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/features" component={Features} />
        <Route path="/features/:id" component={FeatureDetail} />
        <Route path="/lectures" component={LectureList} />
        <Route path="/lecture/:id" component={LectureRoom} />
        <Route path="/vod" component={VodList} />
        <Route path="/vod/:id" component={VodPlayer} />
        <Route path="/instructor" component={InstructorDashboard} />
        <Route path="/instructor/lectures" component={InstructorLectures} />
        <Route path="/instructor/lectures/new" component={InstructorLectureForm} />
        <Route path="/instructor/lectures/:id/edit" component={InstructorLectureForm} />
        <Route path="/instructor/voice-profiles" component={InstructorVoiceProfiles} />
        <Route path="/instructor/templates" component={InstructorTemplates} />
        <Route path="/instructor/face-swap" component={InstructorFaceSwap} />
        <Route path="/instructor/voice-mod" component={InstructorVoiceMod} />
        <Route path="/instructor/platforms" component={InstructorPlatforms} />
        <Route path="/studio" component={ProductionStudio} />
        <Route path="/script/:id" component={ScriptEditor} />
        <Route path="/pipeline-dashboard" component={PipelineDashboard} />
        <Route path="/script-templates" component={ScriptTemplateLibrary} />
        <Route path="/preview/:id" component={PreviewPlayer} />
        <Route path="/broadcasts" component={BroadcastManager} />
        <Route path="/broadcast/studio/:id" component={BroadcastStudio} />
        <Route path="/broadcast/view/:roomCode" component={BroadcastViewer} />
        <Route path="/broadcast/presenter/:roomCode" component={PresenterStudio} />
        <Route path="/obs-tutorial" component={ObsTutorial} />
        <Route path="/browser-studio" component={BrowserStudio} />
        <Route path="/faces" component={FaceGallery} />
        <Route path="/voices" component={VoiceGallery} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/my-subscription" component={MySubscription} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/revenue" component={AdminRevenue} />
        <Route path="/admin/format-templates" component={AdminFormatTemplates} />
        <Route path="/payment/success" component={PaymentSuccess} />
        <Route path="/payments" component={PaymentHistory} />
        <Route path="/crypto-payment/:id" component={CryptoPayment} />
        <Route path="/payment-troubleshooting" component={PaymentTroubleshooting} />
        <Route path="/onboarding" component={OnboardingTutorial} />
        <Route path="/lecture-builder" component={LectureBuilder} />
        <Route path="/lecture-builder/:id" component={LectureBuilder} />
        <Route path="/video-history" component={VideoHistory} />

        {/* AI Studio */}
        <Route path="/ai-studio" component={AkoolStudio} />
        <Route path="/ai-studio/image-to-video" component={AkoolImageToVideo} />
        <Route path="/ai-studio/face-swap" component={AkoolFaceSwap} />
        <Route path="/ai-studio/talking-avatar" component={AkoolTalkingAvatar} />
        <Route path="/ai-studio/video-translate" component={AkoolVideoTranslate} />
        <Route path="/ai-studio/image-gen" component={AkoolImageGen} />
        <Route path="/ai-studio/bg-remove" component={AkoolBgRemove} />
        <Route path="/ai-studio/tts" component={AkoolTTS} />
        <Route path="/ai-studio/voice-clone" component={AkoolVoiceClone} />
        <Route path="/ai-studio/voice-change" component={AkoolVoiceChange} />
        <Route path="/ai-studio/live-camera" component={AkoolLiveCamera} />
        <Route path="/ai-studio/streaming-avatar" component={AkoolStreamingAvatar} />
        <Route path="/ai-studio/video-effects" component={VideoEffectsStudio} />
        <Route path="/ai-studio/models" component={AkoolModels} />
        <Route path="/ai-studio/effects" component={AkoolEffects} />

        {/* SCORM Export */}
        <Route path="/scorm-export" component={ScormExport} />

        {/* Marketplace */}
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/marketplace/:id" component={MarketplaceDetail} />
        <Route path="/creator-dashboard" component={CreatorDashboard} />
        <Route path="/recommendations" component={Recommendations} />

        {/* Live Interpretation */}
        <Route path="/live-interpretation" component={LiveInterpretation} />

        {/* Community Gallery */}
        <Route path="/community" component={CommunityGallery} />

        {/* Credit Dashboard */}
        <Route path="/credits" component={CreditDashboard} />

        {/* Profile, AI History, Admin Analytics */}
        <Route path="/profile" component={UserProfile} />
        <Route path="/ai-history" component={AiHistory} />
        <Route path="/admin/analytics" component={AdminAnalytics} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <GuideTour />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
