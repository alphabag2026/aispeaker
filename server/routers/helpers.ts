// SRT time formatter
export function formatSrtTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const ms = Math.round((totalSec % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

// Certificate HTML generator
export function generateCertificateHtml(studentName: string, lectureTitle: string, code: string, completion: number): string {
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:40px;font-family:'Noto Sans KR',sans-serif;background:#f8f9fa}
    .cert{max-width:800px;margin:0 auto;background:white;border:3px solid #1a1a2e;padding:60px;text-align:center;position:relative}
    .cert::before{content:'';position:absolute;top:10px;left:10px;right:10px;bottom:10px;border:1px solid #e0e0e0}
    h1{color:#1a1a2e;font-size:36px;margin-bottom:10px;letter-spacing:4px}
    .subtitle{color:#6c63ff;font-size:14px;letter-spacing:8px;margin-bottom:40px}
    .name{font-size:32px;color:#1a1a2e;border-bottom:2px solid #6c63ff;display:inline-block;padding:10px 40px;margin:20px 0}
    .lecture{font-size:18px;color:#444;margin:20px 0}
    .completion{font-size:16px;color:#6c63ff;margin:10px 0}
    .date{color:#888;margin-top:30px}
    .code{font-family:monospace;color:#aaa;font-size:12px;margin-top:20px}
    .badge{display:inline-block;background:#6c63ff;color:white;padding:8px 24px;border-radius:20px;margin-top:20px;font-size:14px}
  </style></head><body><div class="cert">
    <h1>Certificate of Completion</h1>
    <div class="subtitle">CERTIFICATE OF COMPLETION</div>
    <p>This certifies that the following student has successfully completed the lecture.</p>
    <div class="name">${studentName}</div>
    <div class="lecture">「${lectureTitle}」</div>
    <div class="completion">Completion: ${completion}%</div>
    <div class="badge">AI Lecture Platform</div>
    <div class="date">${date}</div>
    <div class="code">Certificate Code: ${code}</div>
  </div></body></html>`;
}

// ============ SCORM Helper Functions ============

export function generateScormManifest(title: string, version: string, sections: any[], language: string): string {
  const orgId = `ORG-${Date.now()}`;
  const itemId = `ITEM-${Date.now()}`;
  const resourceId = `RES-${Date.now()}`;
  
  if (version === "1.2") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${orgId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      ${sections.map((s: any, i: number) => `<item identifier="${itemId}-${i}" identifierref="${resourceId}"><title>${s.title || `Section ${i+1}`}</title></item>`).join('\n      ')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${orgId}" version="1.3"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      ${sections.map((s: any, i: number) => `<item identifier="${itemId}-${i}" identifierref="${resourceId}"><title>${s.title || `Section ${i+1}`}</title></item>`).join('\n      ')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceId}" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
}

export function generateScoHtml(title: string, pipeline: any, sections: any[], version: string, includeSubtitles: boolean): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; margin: 0; padding: 20px; background: #0f0f23; color: #e0e0e0; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #6c63ff; text-align: center; }
    .video-container { background: #1a1a2e; border-radius: 12px; padding: 20px; margin: 20px 0; }
    video { width: 100%; border-radius: 8px; }
    .sections { margin-top: 20px; }
    .section { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #6c63ff; }
    .section h3 { color: #6c63ff; margin: 0 0 8px 0; }
    .section p { margin: 0; line-height: 1.6; }
    .progress-bar { height: 4px; background: #333; border-radius: 2px; margin: 20px 0; }
    .progress-fill { height: 100%; background: #6c63ff; border-radius: 2px; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="video-container">
      ${pipeline.finalVideoUrl ? `<video controls src="${pipeline.finalVideoUrl}"></video>` : '<p>Video is not ready.</p>'}
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progress" style="width:0%"></div></div>
    <div class="sections">
      ${sections.map((s: any, i: number) => `<div class="section"><h3>${i+1}. ${s.title || ''}</h3><p>${s.content || ''}</p></div>`).join('')}
    </div>
  </div>
  <script>
    // SCORM ${version} API Communication
    var API = null;
    function findAPI(win) {
      var attempts = 0;
      while ((!win.${version === '1.2' ? 'API' : 'API_1484_11'}) && (win.parent) && (win.parent != win) && (attempts < 10)) {
        attempts++; win = win.parent;
      }
      return win.${version === '1.2' ? 'API' : 'API_1484_11'} || null;
    }
    API = findAPI(window);
    if (API) {
      API.${version === '1.2' ? 'LMSInitialize' : 'Initialize'}("");
      API.${version === '1.2' ? 'LMSSetValue' : 'SetValue'}("${version === '1.2' ? 'cmi.core.lesson_status' : 'cmi.completion_status'}", "incomplete");
    }
    // Track completion
    var sectionsViewed = new Set();
    document.querySelectorAll('.section').forEach(function(el, i) {
      new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          sectionsViewed.add(i);
          var pct = (sectionsViewed.size / ${sections.length || 1}) * 100;
          document.getElementById('progress').style.width = pct + '%';
          if (pct >= 100 && API) {
            API.${version === '1.2' ? 'LMSSetValue' : 'SetValue'}("${version === '1.2' ? 'cmi.core.lesson_status' : 'cmi.completion_status'}", "completed");
            API.${version === '1.2' ? 'LMSCommit' : 'Commit'}("");
          }
        }
      }).observe(el);
    });
    window.onbeforeunload = function() { if (API) API.${version === '1.2' ? 'LMSFinish' : 'Terminate'}(""); };
  </script>
</body>
</html>`;
}

export function generateXapiStatements(title: string, pipeline: any, sections: any[]): object[] {
  const activityId = `https://virtualspeaker.ai/lectures/${pipeline.id}`;
  return [
    {
      verb: { id: "http://adlnet.gov/expapi/verbs/launched", display: { "en-US": "launched" } },
      object: { id: activityId, definition: { name: { "ko": title }, type: "http://adlnet.gov/expapi/activities/course" } },
    },
    {
      verb: { id: "http://adlnet.gov/expapi/verbs/completed", display: { "en-US": "completed" } },
      object: { id: activityId, definition: { name: { "ko": title }, type: "http://adlnet.gov/expapi/activities/course" } },
      result: { completion: true, duration: `PT${pipeline.totalDurationSec || 0}S` },
    },
    ...sections.map((s: any, i: number) => ({
      verb: { id: "http://adlnet.gov/expapi/verbs/experienced", display: { "en-US": "experienced" } },
      object: {
        id: `${activityId}/section/${i}`,
        definition: { name: { "ko": s.title || `Section ${i+1}` }, type: "http://adlnet.gov/expapi/activities/module" },
      },
    })),
  ];
}


