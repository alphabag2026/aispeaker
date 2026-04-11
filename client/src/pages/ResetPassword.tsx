import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const translations = {
  ko: {
    title: "새 비밀번호 설정",
    subtitle: "새로운 비밀번호를 입력해주세요.",
    newPassword: "새 비밀번호",
    confirmPassword: "비밀번호 확인",
    newPasswordPlaceholder: "새 비밀번호 (6자 이상)",
    confirmPasswordPlaceholder: "비밀번호를 다시 입력하세요",
    submit: "비밀번호 변경",
    backToLogin: "로그인으로 돌아가기",
    successTitle: "비밀번호 변경 완료",
    successMessage: "비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.",
    goToLogin: "로그인하기",
    passwordMismatch: "비밀번호가 일치하지 않습니다.",
    invalidToken: "유효하지 않은 재설정 링크입니다. 다시 요청해주세요.",
  },
  en: {
    title: "Set New Password",
    subtitle: "Enter your new password below.",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    newPasswordPlaceholder: "New password (min 6 characters)",
    confirmPasswordPlaceholder: "Re-enter your password",
    submit: "Change Password",
    backToLogin: "Back to Sign In",
    successTitle: "Password Changed",
    successMessage: "Your password has been changed successfully. Sign in with your new password.",
    goToLogin: "Sign In",
    passwordMismatch: "Passwords do not match.",
    invalidToken: "Invalid reset link. Please request a new one.",
  },
  zh: {
    title: "设置新密码",
    subtitle: "请输入您的新密码。",
    newPassword: "新密码",
    confirmPassword: "确认密码",
    newPasswordPlaceholder: "新密码（至少6位）",
    confirmPasswordPlaceholder: "再次输入密码",
    submit: "修改密码",
    backToLogin: "返回登录",
    successTitle: "密码修改成功",
    successMessage: "密码已成功修改。请使用新密码登录。",
    goToLogin: "去登录",
    passwordMismatch: "两次密码不一致。",
    invalidToken: "无效的重置链接，请重新申请。",
  },
  ja: {
    title: "新しいパスワードの設定",
    subtitle: "新しいパスワードを入力してください。",
    newPassword: "新しいパスワード",
    confirmPassword: "パスワード確認",
    newPasswordPlaceholder: "新しいパスワード（6文字以上）",
    confirmPasswordPlaceholder: "パスワードを再入力",
    submit: "パスワードを変更",
    backToLogin: "ログインに戻る",
    successTitle: "パスワード変更完了",
    successMessage: "パスワードが正常に変更されました。新しいパスワードでログインしてください。",
    goToLogin: "ログインへ",
    passwordMismatch: "パスワードが一致しません。",
    invalidToken: "無効なリセットリンクです。再度リクエストしてください。",
  },
};

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success(t.successTitle);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-muted-foreground">{t.invalidToken}</p>
              <Button onClick={() => navigate("/forgot-password")} variant="outline">
                {t.backToLogin}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t.passwordMismatch);
      return;
    }
    resetMutation.mutate({ token, newPassword });
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
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">{t.newPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.newPasswordPlaceholder}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                      disabled={resetMutation.isPending}
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
                      placeholder={t.confirmPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                      disabled={resetMutation.isPending}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t.submit}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">{t.successTitle}</h3>
                <p className="text-sm text-muted-foreground">{t.successMessage}</p>
                <Button onClick={() => navigate("/login")} className="w-full">
                  {t.goToLogin}
                </Button>
              </div>
            )}

            {!success && (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToLogin}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
