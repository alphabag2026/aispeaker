import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LectureList from "./pages/LectureList";
import LectureRoom from "./pages/LectureRoom";
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorLectures from "./pages/InstructorLectures";
import InstructorLectureForm from "./pages/InstructorLectureForm";
import InstructorVoiceProfiles from "./pages/InstructorVoiceProfiles";
import InstructorTemplates from "./pages/InstructorTemplates";
import InstructorFaceSwap from "./pages/InstructorFaceSwap";
import InstructorVoiceMod from "./pages/InstructorVoiceMod";
import InstructorPlatforms from "./pages/InstructorPlatforms";
// MyEnrollments, StudentDashboard, Certificates removed per user request
import VodList from "./pages/VodList";
import VodPlayer from "./pages/VodPlayer";
import ProductionStudio from "./pages/ProductionStudio";
import ObsTutorial from "./pages/ObsTutorial";
import ScriptEditor from "./pages/ScriptEditor";
import PipelineDashboard from "./pages/PipelineDashboard";
import ScriptTemplateLibrary from "./pages/ScriptTemplateLibrary";
import PreviewPlayer from "./pages/PreviewPlayer";
import BroadcastManager from "./pages/BroadcastManager";
import BroadcastStudio from "./pages/BroadcastStudio";
import BroadcastViewer from "./pages/BroadcastViewer";
import FaceGallery from "./pages/FaceGallery";
import VoiceGallery from "./pages/VoiceGallery";
import Pricing from "./pages/Pricing";
import MySubscription from "./pages/MySubscription";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentHistory from "./pages/PaymentHistory";
import AdminRevenue from "./pages/AdminRevenue";
import CryptoPayment from "./pages/CryptoPayment";
import PaymentTroubleshooting from "./pages/PaymentTroubleshooting";
import OnboardingTutorial from "./pages/OnboardingTutorial";
import Features from "./pages/Features";
import FeatureDetail from "./pages/FeatureDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function Router() {
  return (
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
      {/* /my-lectures, /my-dashboard, /certificates routes removed per user request */}
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
      <Route path="/obs-tutorial" component={ObsTutorial} />
      <Route path="/faces" component={FaceGallery} />
      <Route path="/voices" component={VoiceGallery} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/my-subscription" component={MySubscription} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/revenue" component={AdminRevenue} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payments" component={PaymentHistory} />
      <Route path="/crypto-payment/:id" component={CryptoPayment} />
      <Route path="/payment-troubleshooting" component={PaymentTroubleshooting} />
      <Route path="/onboarding" component={OnboardingTutorial} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
