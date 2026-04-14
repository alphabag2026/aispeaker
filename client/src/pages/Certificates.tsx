import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Award, Download, ExternalLink, Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

import { useTranslation } from "@/contexts/LanguageContext";
export default function Certificates() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { data: certificates, isLoading } = trpc.certificate.myCertificates.useQuery(undefined, {
    enabled: !!user,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">{t("cert.loginRequired")}</h2>
          <Button asChild><a href={getLoginUrl()}>{t("cert.login")}</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-44 md:h-52 overflow-hidden">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663373200888/JNDtxB2WrDuBzbhLtHkGn8/banner-certificates-T9TgM2dLxDnDqVRu6aaZZA.webp"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
              <Award className="h-8 w-8" /> {t("cert.myCertificates")}
            </h1>
            <p className="text-white/70 text-lg mt-2">{t("cert.description")}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8">

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : certificates && certificates.length > 0 ? (
          <div className="grid gap-4">
            {certificates.map((cert: any) => (
              <Card key={cert.id} className="overflow-hidden">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Award className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{cert.lectureTitle || t("cert.lectureId", { id: cert.lectureId })}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {t("cert.completionPercent", { percent: cert.completionPercent })}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {t("cert.issuedAt", { date: new Date(cert.issuedAt).toLocaleDateString("ko-KR") })}
                          </span>
                        </div>
                        {cert.certificateNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("cert.certificateNumber", { number: cert.certificateNumber })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {cert.pdfUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" /> PDF
                          </a>
                        </Button>
                      )}
                      {cert.verifyUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> {t("cert.verify")}
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-16 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t("cert.noCertificates")}</p>
            <p className="text-sm mt-1">{t("cert.noCertificatesDescription")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
