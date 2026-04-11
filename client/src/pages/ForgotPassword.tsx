import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

const translations = {
  ko: {
    title: "비밀번호 재설정",
    subtitle: "가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.",
    email: "이메일",
    emailPlaceholder: "가입한 이메일을 입력하세요",
    submit: "재설정 링크 보내기",
    backToLogin: "로그인으로 돌아가기",
    successTitle: "이메일을 확인하세요",
    successMessage: "등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다. 메일함을 확인해주세요.",
    devNote: "개발 모드: 아래 링크를 클릭하여 비밀번호를 재설정하세요.",
    resetNow: "비밀번호 재설정하기",
  },
  en: {
    title: "Reset Password",
    subtitle: "Enter your email and we'll send you a password reset link.",
    email: "Email",
    emailPlaceholder: "Enter your registered email",
    submit: "Send Reset Link",
    backToLogin: "Back to Sign In",
    successTitle: "Check your email",
    successMessage: "If the email is registered, a password reset link will be sent. Please check your inbox.",
    devNote: "Dev mode: Click the link below to reset your password.",
    resetNow: "Reset Password Now",
  },
  zh: {
    title: "重置密码",
    subtitle: "输入您的注册邮箱，我们将发送密码重置链接。",
    email: "邮箱",
    emailPlaceholder: "请输入注册邮箱",
    submit: "发送重置链接",
    backToLogin: "返回登录",
    successTitle: "请查收邮件",
    successMessage: "如果该邮箱已注册，密码重置链接将发送至您的邮箱。",
    devNote: "开发模式：请点击下方链接重置密码。",
    resetNow: "立即重置密码",
  },
  ja: {
    title: "パスワードリセット",
    subtitle: "登録したメールアドレスを入力してください。パスワードリセットリンクをお送りします。",
    email: "メールアドレス",
    emailPlaceholder: "登録メールアドレスを入力",
    submit: "リセットリンクを送信",
    backToLogin: "ログインに戻る",
    successTitle: "メールを確認してください",
    successMessage: "登録済みのメールアドレスであれば、パスワードリセットリンクが送信されます。",
    devNote: "開発モード：下のリンクをクリックしてパスワードをリセットしてください。",
    resetNow: "パスワードをリセット",
  },
};

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      setSent(true);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotMutation.mutate({ email });
  };

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
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={forgotMutation.isPending}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                  {forgotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t.submit}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">{t.successTitle}</h3>
                <p className="text-sm text-muted-foreground">{t.successMessage}</p>
                
                {resetToken && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-400 mb-2">{t.devNote}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/reset-password?token=${resetToken}`)}
                    >
                      {t.resetNow}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.backToLogin}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
