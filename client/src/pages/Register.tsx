import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";

const translations = {
  ko: {
    title: "회원가입",
    subtitle: "AI Speaker 플랫폼에 가입하세요",
    name: "이름",
    email: "이메일",
    password: "비밀번호",
    confirmPassword: "비밀번호 확인",
    register: "회원가입",
    hasAccount: "이미 계정이 있으신가요?",
    login: "로그인",
    namePlaceholder: "이름을 입력하세요",
    emailPlaceholder: "이메일을 입력하세요",
    passwordPlaceholder: "비밀번호를 입력하세요 (6자 이상)",
    confirmPlaceholder: "비밀번호를 다시 입력하세요",
    registerSuccess: "회원가입 성공! 환영합니다.",
    passwordMismatch: "비밀번호가 일치하지 않습니다.",
    passwordTooShort: "비밀번호는 6자 이상이어야 합니다.",
  },
  en: {
    title: "Sign Up",
    subtitle: "Join the AI Speaker Platform",
    name: "Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    register: "Sign Up",
    hasAccount: "Already have an account?",
    login: "Sign In",
    namePlaceholder: "Enter your name",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Enter password (min 6 characters)",
    confirmPlaceholder: "Confirm your password",
    registerSuccess: "Registration successful! Welcome.",
    passwordMismatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 6 characters.",
  },
  zh: {
    title: "注册",
    subtitle: "加入AI Speaker平台",
    name: "姓名",
    email: "邮箱",
    password: "密码",
    confirmPassword: "确认密码",
    register: "注册",
    hasAccount: "已有账号？",
    login: "登录",
    namePlaceholder: "请输入姓名",
    emailPlaceholder: "请输入邮箱",
    passwordPlaceholder: "请输入密码（至少6位）",
    confirmPlaceholder: "请再次输入密码",
    registerSuccess: "注册成功！欢迎加入。",
    passwordMismatch: "两次输入的密码不一致。",
    passwordTooShort: "密码至少需要6个字符。",
  },
  ja: {
    title: "新規登録",
    subtitle: "AI Speakerプラットフォームに参加しましょう",
    name: "お名前",
    email: "メールアドレス",
    password: "パスワード",
    confirmPassword: "パスワード確認",
    register: "登録",
    hasAccount: "すでにアカウントをお持ちの方",
    login: "ログイン",
    namePlaceholder: "お名前を入力",
    emailPlaceholder: "メールアドレスを入力",
    passwordPlaceholder: "パスワードを入力（6文字以上）",
    confirmPlaceholder: "パスワードを再入力",
    registerSuccess: "登録成功！ようこそ。",
    passwordMismatch: "パスワードが一致しません。",
    passwordTooShort: "パスワードは6文字以上必要です。",
  },
};

export default function Register() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success(t.registerSuccess);
      window.location.href = "/";
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Redirect if already logged in
  if (!authLoading && isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t.passwordMismatch);
      return;
    }
    registerMutation.mutate({ email, password, name });
  };

  const isLoading = registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
            <CardDescription className="text-muted-foreground">{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t.name}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t.email}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t.password}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">{t.confirmPassword}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.confirmPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t.register}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {t.hasAccount}{" "}
              <button
                onClick={() => navigate("/login")}
                className="text-primary hover:underline font-medium"
              >
                {t.login}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
