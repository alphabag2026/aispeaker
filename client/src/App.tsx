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
import MyEnrollments from "./pages/MyEnrollments";
import StudentDashboard from "./pages/StudentDashboard";
import VodList from "./pages/VodList";
import VodPlayer from "./pages/VodPlayer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/lectures" component={LectureList} />
      <Route path="/lecture/:id" component={LectureRoom} />
      <Route path="/my-lectures" component={MyEnrollments} />
      <Route path="/my-dashboard" component={StudentDashboard} />
      <Route path="/vod" component={VodList} />
      <Route path="/vod/:id" component={VodPlayer} />
      <Route path="/instructor" component={InstructorDashboard} />
      <Route path="/instructor/lectures" component={InstructorLectures} />
      <Route path="/instructor/lectures/new" component={InstructorLectureForm} />
      <Route path="/instructor/lectures/:id/edit" component={InstructorLectureForm} />
      <Route path="/instructor/voice-profiles" component={InstructorVoiceProfiles} />
      <Route path="/instructor/templates" component={InstructorTemplates} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
