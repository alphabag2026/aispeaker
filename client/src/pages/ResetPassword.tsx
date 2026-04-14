
import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success(t("rp.successTitle"));
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
              <p className="text-muted-foreground">{t("rp.invalidToken")}</p>
              <Button onClick={() => navigate("/forgot-password")} variant="outline">
                {t("rp.backToLogin")}
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
      toast.error(t("rp.passwordMismatch"));
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
            <CardTitle className="text-2xl font-bold">{t("rp.title")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("rp.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">{t("rp.newPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("rp.newPasswordPlaceholder")}
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
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">{t("rp.confirmPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("rp.confirmPasswordPlaceholder")}
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
                  {t("rp.submit")}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">{t("rp.successTitle")}</h3>
                <p className="text-sm text-muted-foreground">{t("rp.successMessage")}</p>
                <Button onClick={() => navigate("/login")} className="w-full">
                  {t("rp.goToLogin")}
                </Button>
              </div>
            )}

            {!success && (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("rp.backToLogin")}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
