import { registerTranslations } from "@/contexts/LanguageContext";

registerTranslations("ko", {
  "forgotPassword.title": "비밀번호 재설정",
  "forgotPassword.subtitle": "가입하신 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.",
  "forgotPassword.email": "이메일",
  "forgotPassword.emailPlaceholder": "가입한 이메일 입력",
  "forgotPassword.submit": "재설정 링크 발송",
  "forgotPassword.backToLogin": "로그인으로 돌아가기",
  "forgotPassword.successTitle": "이메일을 확인해주세요",
  "forgotPassword.successMessage": "가입된 이메일인 경우, 비밀번호 재설정 링크가 전송됩니다. 메일함을 확인해주세요.",
  "forgotPassword.devNote": "개발 모드: 아래 링크를 클릭하여 비밀번호를 재설정하세요.",
  "forgotPassword.resetNow": "비밀번호 재설정하기",
});

registerTranslations("en", {
  "forgotPassword.title": "Reset Password",
  "forgotPassword.subtitle": "Enter your email and we'll send you a password reset link.",
  "forgotPassword.email": "Email",
  "forgotPassword.emailPlaceholder": "Enter your registered email",
  "forgotPassword.submit": "Send Reset Link",
  "forgotPassword.backToLogin": "Back to Sign In",
  "forgotPassword.successTitle": "Check your email",
  "forgotPassword.successMessage": "If the email is registered, a password reset link will be sent. Please check your inbox.",
  "forgotPassword.devNote": "Dev mode: Click the link below to reset your password.",
  "forgotPassword.resetNow": "Reset Password Now",
});

registerTranslations("zh", {
  "forgotPassword.title": "重置密码",
  "forgotPassword.subtitle": "输入您的注册邮箱，我们将发送密码重置链接。",
  "forgotPassword.email": "邮箱",
  "forgotPassword.emailPlaceholder": "请输入注册邮箱",
  "forgotPassword.submit": "发送重置链接",
  "forgotPassword.backToLogin": "返回登录",
  "forgotPassword.successTitle": "请查收邮件",
  "forgotPassword.successMessage": "如果该邮箱已注册，密码重置链接将发送至您的邮箱。",
  "forgotPassword.devNote": "开发模式：请点击下方链接重置密码。",
  "forgotPassword.resetNow": "立即重置密码",
});

registerTranslations("ja", {
  "forgotPassword.title": "パスワードリセット",
  "forgotPassword.subtitle": "登録したメールアドレスを入力してください。パスワードリセットリンクをお送りします。",
  "forgotPassword.email": "メールアドレス",
  "forgotPassword.emailPlaceholder": "登録メールアドレスを入力",
  "forgotPassword.submit": "リセットリンクを送信",
  "forgotPassword.backToLogin": "ログインに戻る",
  "forgotPassword.successTitle": "メールを確認してください",
  "forgotPassword.successMessage": "登録済みのメールアドレスであれば、パスワードリセットリンクが送信されます。",
  "forgotPassword.devNote": "開発モード：下のリンクをクリックしてパスワードをリセットしてください。",
  "forgotPassword.resetNow": "パスワードをリセット",
});

const enFallback: Record<string, string> = {
  "forgotPassword.title": "Reset Password",
  "forgotPassword.subtitle": "Enter your email and we'll send you a password reset link.",
  "forgotPassword.email": "Email",
  "forgotPassword.emailPlaceholder": "Enter your registered email",
  "forgotPassword.submit": "Send Reset Link",
  "forgotPassword.backToLogin": "Back to Sign In",
  "forgotPassword.successTitle": "Check your email",
  "forgotPassword.successMessage": "If the email is registered, a password reset link will be sent. Please check your inbox.",
  "forgotPassword.devNote": "Dev mode: Click the link below to reset your password.",
  "forgotPassword.resetNow": "Reset Password Now",
};

["vi", "th", "id", "ms", "es", "fr", "de", "pt", "ru", "ar", "hi", "it", "nl", "pl", "sv", "tr"].forEach(lang => {
  registerTranslations(lang, enFallback);
});
