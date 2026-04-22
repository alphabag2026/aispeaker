# Project TODO

## 기본 구조
- [x] DB 스키마 설계 (강의, 교안, 음성 프로필, Q&A 등)
- [x] 다크 테마 기반 전문적인 UI 디자인
- [x] 글로벌 네비게이션 및 레이아웃 구성
- [x] 강사/수강생 역할 기반 라우팅

## 사용자 인증 및 역할
- [x] Manus OAuth 기반 로그인/로그아웃
- [x] 강사(instructor)/수강생(student) 역할 구분
- [x] 역할 기반 접근 제어 (강사 전용 백오피스)

## 강사 백오피스
- [x] 강의 생성/수정/삭제 (CRUD)
- [x] 교안(PPT/PDF) 업로드 및 관리
- [x] 음성 프로필 관리 (녹음 업로드, AI 학습 설정)
- [x] 강의 설정 (AI 표현 방식 선택: 음성/텍스트/아바타)

## AI 음성 시스템
- [x] OpenAI TTS 기반 텍스트-음성 변환
- [x] 음성 클로닝 시스템 (강사 녹음 → 스타일 학습)
- [x] 음성 프로필 저장 및 관리

## 실시간 강의실
- [x] 강의실 UI (메인 콘텐츠 + 사이드 채팅)
- [x] PPT 슬라이드 뷰어 (페이지 전환)
- [x] 화이트보드(칠판) 기능 (Canvas 기반)
- [x] AI 인터랙티브 Q&A (텍스트 질문 + AI 답변)
- [x] 수강생 음성 질문 (Web Speech API STT)
- [x] AI 음성 답변 (TTS 재생)

## 수강생 시스템
- [x] 강의 목록 페이지 (검색, 필터)
- [x] 강의 참여 (입장)
- [x] 강의 이력 관리

## 테스트
- [x] 서버 라우터 테스트 (vitest) - 27개 테스트 통과
- [x] 핵심 기능 통합 테스트

## AI 아바타 영상 모드 (v1.1)
- [x] AI 아바타 모드 백엔드 라우터 (aiMode: avatar)
- [x] 강의실에서 아바타 모드 선택 시 아바타 패널 표시
- [x] 아바타가 AI 답변 시 말하는 애니메이션 표시
- [x] 강의 생성 시 아바타 모드 선택 가능
- [x] 아바타 모드 테스트 (avatar/voice/text aiMode 검증)

## 강의 녹화 및 VOD 시스템 (v1.1)
- [x] VOD 관련 DB 테이블 추가 (vodRecordings, vodTimelineEvents)
- [x] Q&A 대화 + 화이트보드 스냅샷 자동 아카이브 (createFromLecture)
- [x] VOD 목록 페이지 (검색, 상태 필터)
- [x] VOD 재생 페이지 (Q&A 타임라인 + 스냅샷 뷰어)
- [x] 강의실에서 VOD 저장 버튼 (강사 전용)
- [x] 강사 대시보드에 VOD 아카이브 퀵 액션 추가
- [x] Navbar에 VOD 메뉴 추가
- [x] VOD 시스템 테스트 (접근 제어, CRUD)

## 다국어 지원 및 자동 번역 (v1.1)
- [x] 다국어 번역 DB 테이블 추가 (translations)
- [x] AI 자동 번역 백엔드 라우터 (LLM 기반, 캐싱)
- [x] 20개 이상 언어 지원 (한국어, 영어, 일본어, 중국어, 스페인어 등)
- [x] Q&A 답변 개별 번역 기능
- [x] 강의실 UI에 국기 아이콘 기반 언어 선택 드롭다운
- [x] VOD 재생 페이지에서도 번역 지원
- [x] 번역 시스템 테스트 (언어 목록, 접근 제어, 입력 검증)
- [x] 사용자 선호 언어 설정 (preferredLang)

## v1.1 테스트
- [x] VOD 시스템 테스트 (7개)
- [x] 번역 시스템 테스트 (6개)
- [x] 아바타 모드 테스트 (4개)
- [x] 사용자 선호 언어 테스트 (2개)
- [x] 크로스 기능 통합 테스트 (3개)
- [x] 전체 49개 테스트 통과

## D-ID API 아바타 영상 연동 (v1.2)
- [x] D-ID 아바타 영상 생성 백엔드 라우터 (avatar.generate)
- [x] 강의실에서 AI 답변 시 D-ID 아바타 영상 실시간 생성/재생
- [x] 아바타 설정 관리 (avatar.getConfig, avatar.updateConfig)
- [x] D-ID 미연동 시 기존 내장 아바타 폴백 (TTS + 애니메이션)
- [x] 강의실 UI에 D-ID 비디오 플레이어 통합

## 카테고리별 AI 컨텍스트 템플릿 (v1.2)
- [x] AI 컨텍스트 템플릿 DB 테이블 (aiContextTemplates)
- [x] 카테고리별 기본 템플릿 시드 데이터 (Web3, DeFi, NFT, AI, Blockchain, Metaverse)
- [x] 템플릿 CRUD 백엔드 라우터 (template.list/create/update/delete)
- [x] 강의 생성 시 카테고리 선택하면 템플릿 자동 로드
- [x] 템플릿 관리 페이지 (InstructorTemplates)
- [x] 강사 대시보드에 AI 템플릿 관리 퀵 액션 추가

## 수강생 대시보드 강화 (v1.2)
- [x] 학습 진도 추적 DB 테이블 (lectureProgress)
- [x] VOD 시청 이력 DB 테이블 (vodWatchHistory)
- [x] Q&A 북마크 DB 테이블 (qaBookmarks)
- [x] 수강생 대시보드 페이지 (진도 요약, 최근 활동, 통계)
- [x] 강의별 진도율 표시 (Q&A 참여 수 기반)
- [x] VOD 시청 이력 탭 (시청 시간, 진도)
- [x] Q&A 북마크 저장/삭제/목록 기능
- [x] 학습 통계 시각화 (Recharts 차트)
- [x] 강의실에서 북마크 버튼 추가
- [x] Navbar에 학습 현황 메뉴 추가

## v1.2 테스트
- [x] 북마크 시스템 테스트 (7개)
- [x] 진도 추적 테스트 (7개)
- [x] AI 컨텍스트 템플릿 테스트 (8개)
- [x] D-ID 아바타 생성 테스트 (4개)
- [x] v1.2 크로스 기능 통합 테스트 (3개)
- [x] 전체 80개 테스트 통과

## 플랫폼 방향 전환 (v2.0) - 강사 중심 AI 강의 자동화 도구
- [x] 플랫폼 개념 재정립: 수강생 접속형 → 강사가 AI로 강의 영상 제작 후 외부 플랫폼에서 사용

## 딥페이크 얼굴 변환 (v2.0)
- [x] 딥페이크 프로필 DB 테이블 (faceSwapProfiles)
- [x] 강사 얼굴 사진 업로드 및 타겟 얼굴 선택
- [x] D-ID/HeyGen API 연동으로 얼굴 변환 영상 생성
- [x] 강사 스튜디오에서 딥페이크 프리뷰
- [x] 딥페이크 설정 관리 UI (InstructorFaceSwap)

## 음성 변조 및 말투 변환 (v2.0)
- [x] 음성 변조 프로필 DB 테이블 (voiceModProfiles)
- [x] 음성 피치/속도/톤 조절 파라미터
- [x] 말투 스타일 변환 (격식체/비격식체/학술체 등)
- [x] 음성 변조 프리뷰 기능
- [x] 변조된 음성으로 TTS 생성
- [x] 음성 변조 관리 UI (InstructorVoiceMod)

## 외부 회의 플랫폼 연동 (v2.0)
- [x] 외부 플랫폼 설정 DB 테이블 (platformIntegrations)
- [x] Zoom 미팅 링크 생성/연동
- [x] Google Meet 연동
- [x] Webex/Tencent Meeting 연동 정보 관리
- [x] 강의 영상을 외부 플랫폼에서 스트리밍하는 가이드/설정
- [x] OBS/가상 카메라 연동 가이드
- [x] 외부 플랫폼 관리 UI (InstructorPlatforms)

## WebRTC 실시간 스트리밍 (v2.0)
- [x] WebRTC 기반 실시간 영상/음성 스트리밍 (세션 시스템)
- [x] 가상 카메라 출력 (딥페이크 + 음성 변조 적용된 스트림)
- [x] 세션 시작/종료 관리

## 수료증 자동 발급 (v2.0)
- [x] 수료증 DB 테이블 (certificates)
- [x] 진도 달성 시 자동 수료증 생성
- [x] 수료증 HTML 다운로드
- [x] 수료증 디자인 템플릿
- [x] 수료증 인증코드 검증 기능
- [x] 수료증 목록/발급 UI (Certificates 페이지)

## D-ID API 강화 (v2.0)
- [x] D-ID API 키 설정 UI (Settings)
- [x] 실제 AI 아바타 영상 생성 연동
- [x] 아바타 + 딥페이크 결합 모드

## Home 페이지 v2.0 업데이트
- [x] 강사 중심 AI 강의 자동화 도구 방향 반영
- [x] 작동 방식 3단계 소개 섹션
- [x] 지원 플랫폼 목록 (Zoom, Google Meet, Webex 등)
- [x] 12개 전체 기능 카드 (NEW 배지 포함)
- [x] 강사 대시보드에 딥페이크/음성변조/외부플랫폼 퀵 액션 추가

## v2.0 테스트
- [x] 딥페이크 라우터 테스트 (5개)
- [x] 음성 변조 라우터 테스트 (8개)
- [x] 외부 플랫폼 연동 테스트 (5개)
- [x] 수료증 시스템 테스트 (4개)
- [x] 세션 시스템 테스트 (6개)
- [x] 입력 검증 엣지 케이스 테스트 (5개)
- [x] 전체 114개 테스트 통과

## 원클릭 강의 영상 제작 파이프라인 (v2.1)
- [x] 강의 스크립트 자동 생성 DB 테이블 (lectureScripts)
- [x] 영상 제작 파이프라인 DB 테이블 (productionPipelines)
- [x] 프롬프트 → AI 스크립트 자동 생성 백엔드 라우터
- [x] 스크립트 → TTS 음성 생성 파이프라인
- [x] 음성 + 아바타 → 영상 생성 파이프라인
- [x] 딥페이크 + 음성 변조 적용 옵션
- [x] 원클릭 강의 제작 스튜디오 UI 페이지 (ProductionStudio)
- [x] 파이프라인 진행 상태 실시간 표시
- [x] 생성된 영상 미리보기 및 다운로드

## OBS 가상 카메라 튜토리얼 (v2.1)
- [x] OBS 설치 및 설정 가이드
- [x] 가상 카메라 출력 설정 방법
- [x] 딥페이크 + 음성 변조 스트림 연동 방법
- [x] Zoom/Google Meet/Webex에서 가상 카메라 사용법
- [x] 단계별 상세 튜토리얼 페이지 (ObsTutorial)

## D-ID API 키 연동 (v2.1)
- [x] D-ID API 키 입력 설정 (webdev_request_secrets)
- [x] API 키 유효성 검증 테스트
- [x] D-ID API 연동 시 실제 아바타 영상 생성 활성화
- [x] API 키 미설정 시 폴백 모드 안내

## v2.1 테스트
- [x] 스크립트 생성 테스트 (10개) - 입력 검증, 권한, 카테고리 enum
- [x] 파이프라인 테스트 (7개) - 권한, 입력, 옵션 프로필
- [x] D-ID API 설정 테스트 (3개) - env, 권한
- [x] 라우트 구조 검증 테스트 (2개)
- [x] 전체 138개 테스트 통과

## 스크립트 편집기 강화 (v2.2)
- [x] 섹션별 드래그&드롭 재배치 기능 (reorderSections 라우터 + UI)
- [x] 개별 섹션 인라인 편집 (updateSection 라우터 + 인라인 편집 UI)
- [x] 개별 섹션만 AI로 재생성하는 기능 (regenerateSection + 커스텀 프롬프트)
- [x] 섹션 추가/삭제 기능 (UI에서 섹션 삭제 버튼)
- [x] 섹션별 예상 시간 자동 계산 (총 예상 시간 표시)
- [x] 스크립트 편집기 전용 페이지 (ScriptEditor)

## 파이프라인 히스토리 대시보드 (v2.2)
- [x] 파이프라인 통계 백엔드 라우터 (pipeline.stats)
- [x] 월별 생성 추이 차트 (Recharts BarChart)
- [x] 카테고리별 분포 파이 차트 (Recharts PieChart)
- [x] 최근 파이프라인 목록 (상태별 필터)
- [x] 파이프라인 히스토리 대시보드 페이지 (PipelineDashboard)

## 자동 자막 생성 (v2.2)
- [x] 파이프라인에서 생성된 음성 → STT 자동 변환 (pipeline.generateSubtitles)
- [x] SRT 자막 파일 자동 생성 (LLM 기반 SRT 포맷)
- [x] 자막 미리보기 및 다운로드 (PipelineDashboard에서)
- [x] 자막 파일 다운로드 (SRT 형식)
- [x] 파이프라인 완료 시 자막 생성 버튼

## v2.2 테스트
- [x] 스크립트 편집기 테스트 (7개) - updateSection, regenerateSection, reorderSections
- [x] 파이프라인 통계 테스트 (5개) - stats, generateSubtitles
- [x] 라우트 구조 검증 테스트 (5개)
- [x] 권한 검증 테스트 (2개)
- [x] 전체 157개 테스트 통과

## 스크립트 템플릿 라이브러리 (v2.3)
- [x] 스크립트 템플릿 DB 테이블 (scriptTemplates)
- [x] 템플릿 CRUD 백엔드 라우터 (scriptTemplate.list/create/update/delete)
- [x] 기존 스크립트에서 템플릿으로 저장 기능
- [x] 템플릿 기반 새 스크립트 생성 기능
- [x] 기본 내장 템플릿 제공 (도입-본론-결론, Q&A 포함, 실습형 등)
- [x] 스크립트 템플릿 라이브러리 UI 페이지 (ScriptTemplateLibrary)
- [x] ProductionStudio에서 템플릿 선택하여 스크립트 생성 연동

## 파이프라인 배치 처리 (v2.3)
- [x] 배치 파이프라인 백엔드 라우터 (pipeline.batchStart)
- [x] 여러 스크립트 동시 선택 UI
- [x] 배치 진행 상태 표시 (전체/개별 진행률)
- [x] 배치 결과 요약 (성공/실패 건수)
- [x] ProductionStudio에 배치 제작 탭 추가

## 강의 영상 썸네일 자동 생성 (v2.3)
- [x] 썸네일 생성 백엔드 라우터 (pipeline.generateThumbnail)
- [x] AI 이미지 생성 API 연동 (generateImage 활용)
- [x] 강의 주제 기반 자동 프롬프트 생성
- [x] 썸네일 미리보기 및 재생성 기능
- [x] 파이프라인 완료 후 썸네일 자동 생성 옵션
- [x] 썸네일 다운로드 기능

## v2.3 테스트
- [x] 스크립트 템플릿 CRUD 테스트 (7개)
- [x] 배치 파이프라인 테스트 (2개)
- [x] 썸네일 생성 테스트 (1개)
- [x] 라우트 구조 검증 테스트
- [x] 전체 167개 테스트 통과

## 브랜드 네이밍 (v2.4)
- [x] 브랜드명 "Virtual Speaker" 확정 및 적용
- [x] 사이트 타이틀 변경 (index.html title)
- [x] Navbar 브랜드명 반영
- [x] Home 페이지 브랜딩 반영
- [x] Footer 브랜딩 반영

## 스크립트 버전 관리 (v2.4)
- [x] 스크립트 버전 DB 테이블 (scriptVersions)
- [x] 스크립트 수정 시 자동 버전 스냅샷 저장
- [x] 버전 목록 조회 (script.versions)
- [x] 특정 버전으로 롤백 기능 (script.rollback)
- [x] 버전 간 비교(diff) 기능 (버전 이력에서 섹션 수/시간 비교)
- [x] ScriptEditor에 버전 이력 사이드패널 추가 (Sheet)
- [x] 버전 롤백 확인 다이얼로그

## 통합 미리보기 플레이어 (v2.4)
- [x] 미리보기 데이터 조합 백엔드 라우터 (pipeline.preview)
- [x] 슬라이드 + 오디오 동기화 플레이어 컴포넌트
- [x] 섹션별 자동 전환 (타임라인 기반)
- [x] 재생/일시정지/이전/다음 섹션 컨트롤
- [x] 프로그레스 바 및 시간 표시
- [x] 전용 미리보기 페이지 (/preview/:id)

## AI 콘텐츠 분석 리포트 (v2.4)
- [x] 콘텐츠 분석 DB 테이블 (contentAnalyses)
- [x] AI 분석 백엔드 라우터 (script.analyze)
- [x] 가독성 점수 (문장 길이, 어휘 수준)
- [x] 난이도 적절성 평가
- [x] 키워드 밀도 분석
- [x] 구조 균형 분석 (섹션별 시간 배분)
- [x] AI 개선 제안 생성
- [x] 분석 결과 시각화 UI (점수 카드, 프로그레스 바, 지표)

## v2.4 테스트
- [x] 스크립트 버전 관리 테스트 (6개)
- [x] 미리보기 플레이어 테스트 (2개)
- [x] 콘텐츠 분석 테스트 (2개)
- [x] 전체 178개 테스트 통과

## 단체 방송 시스템 (v2.5)

### DB 스키마
- [x] liveBroadcasts 테이블 (방송 세션 관리)태, 슬라이드 동기화)
- [x] broadcastViewers 테이블 (시청자 참여 기록)
- [x] broadcastChats 테이블 (실시간 채팅)

### 백엔드 라우터
- [x] broadcast.create - 방송방 생성 (스크립트 기반)
- [x] broadcast.start - 방송 시작
- [x] broadcast.end - 방송 종료
- [x] broadcast.list - 내 방송 목록
- [x] broadcast.liveList - 현재 진행중인 방송 목록 (공개)
- [x] broadcast.get - 방송 상세 정보
- [x] broadcast.updateSlide - 슬라이드 전환 (강사)
- [x] broadcast.syncState - 현재 방송 상태 폴링 (시청자)
- [x] broadcast.join - 시청자 입장
- [x] broadcast.leave - 시청자 퇴장
- [x] broadcast.chat - 채팅 메시지 전송
- [x] broadcast.chatHistory - 채팅 이력 조회

### 프론트엔드 - 방송 관리
- [x] 방송 관리 대시보드 (BroadcastManager 페이지)
- [x] 방송 생성 다이얼로그 (스크립트 선택, 제목, 설명)
- [x] 방송 목록 (예정/진행중/종료)

### 프론트엔드 - 강사 방송 스튜디오
- [x] BroadcastStudio 페이지 (강사 전용)
- [x] 슬라이드 뷰어 (현재 섹션 내용 표시)
- [x] 슬라이드 네비게이션 (이전/다음)
- [x] TTS 오디오 자동 재생 (섹션별)
- [x] 시청자 수 실시간 표시
- [x] 채팅 패널 (시청자 메시지 확인)
- [x] 방송 시작/종료 컨트롤

### 프론트엔드 - 시청자 라이브 뷰어
- [x] BroadcastViewer 페이지 (시청자용)
- [x] 슬라이드 실시간 동기화 (200ms 폴링)
- [x] TTS 오디오 동기화 재생
- [x] 채팅 패널 (메시지 전송/수신)
- [x] 시청자 수 표시
- [x] 방송 종료 시 안내

### 네비게이션 연동
- [x] App.tsx 라우트 추가 (3개)
- [x] InstructorDashboard v2.5 카드 추가
- [x] Navbar 라이브 방송 링크 추가

### 테스트
- [x] 방송 CRUD 테스트
- [x] 슬라이드 동기화 테스트
- [x] 채팅 테스트
- [x] 전체 200개 테스트 통과

## 사이트 디자인 개선 (v2.5.1)
- [x] 버추얼 강사 AI 이미지 생성 (2종)
- [x] Home 페이지 히어로 섹션에 이미지 적용
- [x] 배경 디자인 개선 (그라디언트 오버레이 + 90vh 히어로)

## 강의 화면 데모 섹션 (v2.5.2)
- [x] 강의 화면 예시 이미지 AI 생성 (4종 생성 후 데모 섹션 제거로 변경)
- [x] Home 페이지 데모 섹션 제거 + 기능/CTA 섹션에 이미지 배경 추가
- [x] 반응형 레이아웃 적용

## 전체 페이지 이미지 풍성화 (v2.5.2)
- [x] 페이지별 배너 이미지 AI 생성 (9종)
- [x] Home 페이지 데모 섹션 제거 + How it works/Features/CTA에 이미지 배경
- [x] 내 수강 (MyEnrollments) 배너 추가
- [x] 학습 현황 (StudentDashboard) 배너 추가
- [x] 수료증 (Certificates) 배너 추가
- [x] 강사 대시보드 + 강의관리 + 강의폼 + 음성프로필 + 음성변조 + 딥페이크 + 외부플랫폼 + AI템플릿 + OBS튜토리얼 배너 추가
- [x] 제작 스튜디오 (ProductionStudio) + 스크립트 에디터 + 스크립트 템플릿 + 파이프라인 대시보드 배너 추가
- [x] 강의 목록 (LectureList) 배너 추가
- [x] 방송 관리 (BroadcastManager) + VOD 아카이브 (VodList) 배너 추가

## UI 개선 (v2.5.3)
- [x] Navbar에서 내 수강/학습 현황/수료증 메뉴 제거
- [x] AI 로고 생성 및 Navbar 적용
- [x] 빈 상태(Empty State) AI 일러스트 추가
- [x] 라이트 테마 전환 기능 추가
- [x] 불필요한 라우트 제거 (내 수강, 학습 현황, 수료증)
- [x] 전체 200개 테스트 통과 확인

## 서비스 런칭 대규모 업데이트 (v3.0)

### 메인 화면 비주얼 강화
- [x] 강사 얼굴이 보이는 화상회의 장면 이미지 생성 (Zoom/Google Meet/Tencent Meeting)
- [x] 히어로 섹션 재디자인 - 실제 강사가 AI로 강의하는 모습 강조
- [x] How it Works 섹션 이미지를 실제 화상회의 UI 스크린샷 스타일로 교체
- [x] 강사 얼굴 갤러리 쇼케이스 섹션 추가 (다양한 AI 강사 페르소나)
- [x] 실제 서비스 사용 시나리오 비주얼 (Before/After 변환 예시)

### 얼굴/목소리 샘플 갤러리 시스템
- [x] 샘플 얼굴 DB 테이블 (sampleFaces) - 카테고리별 AI 얼굴 프리셋
- [x] 샘플 목소리 DB 테이블 (sampleVoices) - 언어/성별/톤별 음성 프리셋
- [x] 얼굴 갤러리 페이지 (FaceGallery) - 카테고리별 브라우징, 미리보기
- [x] 목소리 갤러리 페이지 (VoiceGallery) - 샘플 오디오 재생, 필터
- [x] 강사 스튜디오에서 갤러리 연동 (얼굴/목소리 선택 → 프로필 적용)
- [x] 시드 데이터 - 기본 제공 얼굴/목소리 샘플 등록

### 수익 구조 및 상품 체계
- [x] 구독 플랜 DB 테이블 (subscriptionPlans) - Free/Pro/Enterprise
- [x] 유저 구독 DB 테이블 (userSubscriptions) - 구독 상태, 기간, 결제
- [x] 크레딧 시스템 DB 테이블 (creditTransactions) - 영상 생성 크레딧
- [x] 가격 정책 페이지 (Pricing) - 플랜 비교표, CTA
- [x] 구독 관리 페이지 (MySubscription) - 현재 플랜, 사용량, 업그레이드
- [x] 크레딧 사용량 추적 (영상 생성/TTS/아바타 등 기능별 차감)
- [x] 기능별 접근 제어 (플랜에 따른 기능 제한)

### 관리자 백오피스
- [x] 관리자 대시보드 (AdminDashboard) - 핵심 KPI, 매출, 유저 통계
- [x] 유저 관리 (AdminUsers) - 목록, 검색, 역할 변경, 구독 상태
- [x] 구독/매출 관리 (AdminRevenue) - 매출 차트, 구독 통계, 플랜별 분포
- [x] 콘텐츠 관리 (AdminContent) - 생성된 강의/영상 모니터링
- [x] 샘플 관리 (AdminSamples) - 얼굴/목소리 샘플 CRUD
- [x] 시스템 설정 (AdminSettings) - 플랜 가격, 크레딧 단가 설정

### v3.0 테스트
- [x] 샘플 얼굴 갤러리 테스트 (5개) - 목록, 필터, 상세, 권한 검증
- [x] 샘플 목소리 갤러리 테스트 (4개) - 목록, 필터, 상세, 권한 검증
- [x] 구독 플랜 테스트 (4개) - 목록, slug 조회, ID 조회, 권한
- [x] 유저 구독 테스트 (6개) - 자동 할당, 구독, 에러, 인증, 관리자
- [x] 크레딧 시스템 테스트 (3개) - 잔액, 이력, 인증
- [x] 라우트 구조 검증 테스트 (5개)
- [x] 전체 227개 테스트 통과

## 수익 모델 재설계 (v3.1) - API 비용 기반 마진 30~90% 확보

### API 비용 분석 및 가격 재설계
- [x] API 비용 구조 분석 (D-ID, OpenAI TTS, LLM, 이미지 생성 등)
- [x] 기능별 원가 산출 (영상 1분당, TTS 1000자당, 스크립트 생성 1건당)
- [x] 크레딧 단가 재설계 (원가 + 마진 30~90% 반영)
- [x] 구독 플랜 가격 대폭 인상 (Free/Starter/Professional/Business/Enterprise)
- [x] 플랜별 기능 제한 강화 (Free는 체험용, Pro는 실사용, Enterprise는 대량)

### DB 및 시드 데이터 업데이트
- [x] subscriptionPlans 가격 업데이트
- [x] 크레딧 단가 테이블 추가/업데이트
- [x] 기능별 크레딧 차감량 명시

### Pricing 페이지 재디자인
- [x] 비용 구조 투명하게 표시 (크레딧 단가표)
- [x] ROI 계산기 추가 (강사가 절약하는 비용 시각화)
- [x] 기능별 상세 비교표 강화

### 테스트
- [x] 가격 업데이트 반영 테스트 (227개 전체 통과)

## 결제 시스템 + 크레딧 차감 + 매출 대시보드 (v3.2)

### DB 스키마 확장
- [x] payments 테이블 (결제 내역 - Stripe/암호화폐 통합)
- [x] cryptoPayments 테이블 (암호화폐 결제 상세)
- [x] creditUsageLogs 테이블 (크레딧 차감 이력)

### Stripe 결제 연동
- [x] Stripe 구독 결제 (월간/연간 플랜)
- [x] Stripe 크레딧 패키지 일회성 결제
- [x] Stripe 웹훅 처리 (결제 성공/실패/환불)
- [x] 구독 상태 자동 동기화

### 암호화폐 결제
- [x] 암호화폐 결제 수단 선택 UI (USDT/USDC/ETH/BTC)
- [x] 지갑 주소 생성 및 QR 코드 표시
- [x] 결제 상태 추적 (pending/confirmed/expired)
- [x] 결제 확인 후 크레딧/구독 자동 활성화

### 크레딧 자동 차감 백엔드
- [x] creditGuard 미들웨어 (기능 사용 전 잔액 확인)
- [x] 기능별 크레딧 차감 로직 (스크립트/TTS/영상/딥페이크/자막/썸네일)
- [x] 크레딧 부족 시 에러 처리 및 업그레이드 안내
- [x] 크레딧 사용 이력 기록

### 관리자 매출 대시보드
- [x] MRR(월간 반복 매출) 차트
- [x] 플랜별 가입자 분포 파이 차트
- [x] 크레딧 소비 추이 라인 차트
- [x] 결제 내역 테이블 (Stripe + 암호화폐)
- [x] 일별/주별/월별 매출 통계

### 결제 UI
- [x] 체크아웃 페이지 (결제 수단 선택: 카드/암호화폐)
- [x] 결제 내역 페이지 (유저용)
- [x] 결제 성공/실패 콜백 페이지
- [x] 관리자 매출 대시보드 UI (AdminRevenue 페이지)

### 테스트
- [x] 결제 시스템 테스트 (18개 통과)
- [x] 크레딧 차감 로직 테스트
- [x] 매출 대시보드 API 테스트
- [x] 전체 245개 테스트 통과 (13개 파일)

## v3.3 결제 실전 연동 + 크레딧 안내 (v3.3)

### Stripe 테스트 결제 시연
- [x] Stripe 체크아웃 세션 생성 플로우 검증
- [x] 테스트 카드(4242)로 구독 결제 시연 준비
- [x] 웹훅 처리 후 구독 활성화 확인
- [x] Pricing 페이지에서 결제 버튼 → Stripe 체크아웃 → 성공 페이지 전체 플로우

### 암호화폐 실제 지갑 연결
- [x] 환경변수로 수신 지갑 주소 관리 (CRYPTO_WALLET_EVM/TRON/BTC)
- [x] 네트워크별(ERC20/TRC20/BEP20) 실제 지갑 주소 연동
- [x] 암호화폐 결제 상세 페이지 (QR코드, 타이머, 상태 추적)
- [x] 관리자 수동 입금 확인 기능
- [x] 결제 만료 타이머 (30분)

### 크레딧 부족 시 안내 기능
- [x] CreditGuardModal 컴포넌트 생성 (크레딧 부족 감지 모달)
- [x] AI 아바타 영상 생성 시 크레딧 체크 → 부족 시 모달 표시
- [x] 스크립트 생성/TTS 변환 등 크레딧 소비 기능에 가드 적용 (ProductionStudio)
- [x] 모달에서 크레딧 충전 페이지로 직접 이동 버튼
- [x] 현재 잔액 및 필요 크레딧 표시

### 테스트
- [x] Stripe 결제 플로우 테스트 (18개 통과)
- [x] 크레딧 가드 모달 테스트
- [x] 암호화폐 결제 상태 추적 테스트
- [x] 전체 267개 테스트 통과 (14개 파일)

## v3.4 결제 가이드 + FAQ + 온보딩 튜토리얼

### Stripe 결제 문제 해결 가이드
- [x] PaymentTroubleshooting 페이지 생성
- [x] 테스트 카드 정보 안내 (4242 4242 4242 4242)
- [x] 일반적인 결제 실패 원인 및 해결 방법
- [x] 브라우저/쿠키 문제 해결 안내
- [x] 결제 수단별 트러블슈팅 (카드/암호화폐)

### 암호화폐 결제 FAQ
- [x] CryptoPayment 페이지에 FAQ 섹션 추가
- [x] 7개 Q&A 작성 (지원 코인, 활성화 시간, 금액 불일치, 시간 만료, 환불, 네트워크 오류, 정기 구독)
- [x] 아코디언 UI로 구현

### 결제 성공 후 온보딩 튜토리얼
- [x] OnboardingTutorial 페이지 생성 (6단계 핵심 기능 안내)
- [x] PaymentSuccess 페이지에서 온보딩으로 연결 (추천 버튼)
- [x] AI 얼굴 → 음성 → 스크립트 → 영상 제작 → 라이브 방송 → 크레딧 관리 플로우 안내
- [x] 진행률 추적, PRO TIP, 빠른 링크 섹션

### 라우트 및 네비게이션
- [x] App.tsx에 새 라우트 등록 (/payment-troubleshooting, /onboarding)
- [x] 관련 페이지 간 링크 연결 (Pricing→Troubleshooting, CryptoFAQ→Troubleshooting, PaymentSuccess→Onboarding)

### 테스트
- [x] 새 페이지 구조 테스트 (17개 - v3.4-pages.test.ts)
- [x] 전체 284개 테스트 통과 (15개 파일)

## v3.4.1 결제/온보딩/FAQ 개선

### Stripe 테스트 카드 실패 시나리오
- [x] PaymentTroubleshooting에 Stripe 테스트 카드 실패 시나리오 섹션 추가 (8종)
- [x] 다양한 실패 카드 번호 및 시나리오 안내 (일반거절, 잔액부족, 분실, 도난, 만료, CVC오류, 처리오류, 3DS실패)
- [x] 각 시나리오별 예상 에러 메시지, 설명, 해결 방법, 카드번호 복사 버튼

### 온보딩 튜토리얼 개선
- [x] 각 단계에 예상 소요 시간 amber 뱃지로 강조 표시 + 전체 소요시간(약 30~42분) 표시
- [x] 전체 단계 완료 시 축하 모달 (Trophy + 별 5개 + 제작 스튜디오 이동 버튼)

### 암호화폐 결제 FAQ 로고
- [x] 각 FAQ 질문 옆에 관련 암호화폐 SVG 로고 아이콘 추가 (USDT #26A17B, USDC #2775CA, ETH #627EEA, BTC #F7931A)

### v3.4.1 테스트
- [x] 13개 테스트 통과 (v3.4.1-improvements.test.ts)
- [x] 전체 297개 테스트 통과 (16개 파일)

## v3.5 결제 E2E 검증, 이메일 알림, 다국어 확장

### Stripe 결제 플로우 E2E 검증
- [ ] Stripe 샌드박스 claim 안내 메시지 추가
- [ ] 테스트 카드(4242...)로 실제 결제 플로우 검증
- [ ] 결제 → 구독 활성화 → 온보딩 연결 E2E 확인
- [ ] PaymentSuccess 페이지에서 구독 상태 실시간 반영

### 결제 이메일 알림 시스템
- [ ] 알림 DB 테이블 추가 (paymentNotifications)
- [ ] 결제 완료 시 알림 발송 (webhook: checkout.session.completed)
- [ ] 구독 갱신 시 알림 발송 (webhook: invoice.paid)
- [ ] 결제 실패 시 알림 발송 (webhook: invoice.payment_failed)
- [ ] 알림 이력 조회 페이지

### 다국어 지원 확장 (Pricing/Troubleshooting/Onboarding)
- [ ] i18n 시스템 구축 (언어 컨텍스트 + 번역 파일)
- [ ] 언어 선택 UI (국기 아이콘 기반)
- [ ] Pricing 페이지 영어/중국어/일본어 번역
- [ ] PaymentTroubleshooting 페이지 영어/중국어/일본어 번역
- [ ] OnboardingTutorial 페이지 영어/중국어/일본어 번역

### 테스트
- [ ] 결제 E2E 플로우 테스트
- [ ] 이메일 알림 시스템 테스트
- [ ] 다국어 번역 파일 구조 테스트
- [ ] 전체 테스트 통과 확인

## v3.5 브랜드명 변경, 도메인, 이메일 알림, 다국어

### 브랜드명 변경 (Virtual Speaker → AI Speaker)
- [x] VITE_APP_TITLE 변경 (Settings → General에서 설정 안내)
- [x] index.html title 변경
- [x] Navbar 브랜드명 변경
- [x] Home 페이지 브랜딩 반영
- [x] Footer 브랜딩 반영
- [x] 전체 파일에서 "Virtual Speaker" → "AI Speaker" 일괄 변경 (Navbar, Home, Pricing, AdminDashboard, OnboardingTutorial, routers.ts)

### 도메인 설정
- [x] aispeaker.cc 커스텀 도메인 바인딩 안내 (Settings → Domains에서 설정)

### 결제 알림 시스템
- [x] 웹훅에 결제 완료 알림 추가 (notifyOwner - 구독/크레딧)
- [x] 웹훅에 구독 갱신 알림 추가 (invoice.payment_succeeded)
- [x] 웹훅에 결제 실패 알림 추가 (payment_intent.payment_failed)
- [x] 웹훅에 구독 해지 알림 추가 (customer.subscription.deleted)

### 다국어 지원 확장 (Pricing/Troubleshooting/Onboarding)
- [x] i18n 시스템 구축 (LanguageContext + LanguageProvider + registerTranslations)
- [x] 언어 선택 UI (LanguageSwitcher - 국기 아이콘 드롭다운, Navbar 통합)
- [x] Pricing 페이지 영어/중국어/일본어 번역 (40+ 키)
- [x] PaymentTroubleshooting 페이지 영어/중국어/일본어 번역 (20+ 키)
- [x] OnboardingTutorial 페이지 영어/중국어/일본어 번역 (30+ 키)

### 테스트
- [x] 브랜드명 변경 테스트 (5개)
- [x] 결제 알림 시스템 테스트 (5개)
- [x] i18n 시스템 테스트 (4개)
- [x] 번역 파일 구조 테스트 (4개)
- [x] 전체 315개 테스트 통과 (17개 파일)

## v3.6 기능(Features) 소개 페이지

### 기능 페이지 구현
- [x] Features 페이지 컴포넌트 생성 (5개 카테고리, 18개 기능 카드)
- [x] AI 얼굴 변환, AI 음성, 스크립트 자동 생성, 영상 제작, 라이브 방송, 다국어 등 핵심 기능 소개
- [x] 각 기능별 아이콘, 설명, details 목록, CORE/POPULAR 뱃지, 그라디언트 카드
- [x] 반응형 레이아웃 (1/2/3칼럼 그리드)
- [x] App.tsx 라우트 등록 (/features)
- [x] Navbar에 '기능' 메뉴 추가 (Layers 아이콘)
- [x] Home 페이지에서 기능 페이지로 연결 CTA ("전체 기능 상세 보기")
- [x] 플랜별 기능 비교 테이블 (Starter/Professional/Business)
- [x] Stats 섹션 (50+ AI 얼굴, 20+ 음성, 20+ 언어, 18+ 기능)
- [x] CTA 섹션 (로그인/스튜디오 연결)

### 테스트
- [x] Features 페이지 구조 테스트 (16개 - v3.6-features-page.test.ts)
- [x] 전체 331개 테스트 통과 (18개 파일)

## v3.7 기능 페이지 다국어, 데모 미디어, 상세 페이지

### 기능 페이지 다국어 번역
- [x] features.ts 번역 파일 생성 (4개 언어: 한/영/중/일)
- [x] Features.tsx에 useLanguage().t() 적용 (32개 번역 키)
- [x] 카테고리명, 기능명, 설명, 상세 항목, CTA, Stats 등 전체 번역

### 데모 프리뷰 애니메이션
- [x] 각 기능 카드에 CSS 기반 데모 프리뷰 애니메이션 추가
- [x] 기능 카드 UI에 미디어 영역 추가 (호버 시 애니메이션 재생)
- [x] 아이콘 기반 시각적 데모 표현

### 기능별 상세 페이지
- [x] FeatureDetail 페이지 컴포넌트 생성 (/features/:id)
- [x] 기능별 4단계 튜토리얼 + 3개 활용 사례 + 관련 기능 연결
- [x] App.tsx에 /features/:id 라우트 등록
- [x] Features.tsx 카드 클릭 시 상세 페이지로 이동
- [x] 상세 페이지 다국어 번역 (4개 언어 튜토리얼+활용사례+UI)

### 테스트
- [x] 번역 파일 구조 테스트 (9개)
- [x] 상세 페이지 구조 테스트 (7개)
- [x] Features 페이지 업데이트 테스트 (3개)
- [x] 전체 352개 테스트 통과 (19개 파일)

## 중국어 번역 완벽 수정 (v3.5.1)
- [x] Home.tsx 하드코딩 한국어를 i18n 시스템으로 전환 (ko/en/zh/ja)
- [x] Navbar.tsx 하드코딩 한국어를 i18n 시스템으로 전환 (ko/en/zh/ja)
- [x] Pricing.tsx 하드코딩 한국어를 i18n 시스템으로 전환 (ko/en/zh/ja)
- [x] i18n 번역 파일 생성: home.ts, navbar.ts, pricingPage.ts
- [x] Vultr 서버(aispeaker.cc)에 번역 업데이트 재배포

## 중국어 번역 원어민 수준 검수 (v3.5.2)
- [x] 모든 i18n 번역 파일 중국어 검수 (home.ts, navbar.ts, pricingPage.ts, features.ts, pricing.ts, onboarding.ts, troubleshooting.ts)
- [x] 어색한 표현/직역체/문법 오류 수정
- [x] 중국 현지 표현/관용어로 자연스럽게 개선
- [x] Vultr 서버 재배포

## 인증 시스템 변경 - Manus OAuth 제거 + 이메일/Google 로그인 (v4.0)
- [x] 현재 Manus OAuth 인증 코드 분석
- [x] DB 스키마 수정 (email, password_hash, google_id 필드 추가)
- [x] 서버 이메일/비밀번호 회원가입 API 구현
- [x] 서버 이메일/비밀번호 로그인 API 구현
- [x] 서버 Google OAuth 로그인 API 구현
- [x] 프론트엔드 로그인 페이지 UI 구현
- [x] 프론트엔드 회원가입 페이지 UI 구현
- [x] Manus OAuth 관련 코드 완전 제거
- [x] 테스트 및 빌드 확인
- [x] AWS Lightsail 서버 재배포

## 관리자 계정 초기 설정 (v4.1)
- [x] 첫 번째 가입 사용자 자동 관리자 승격 로직
- [x] 관리자 존재 여부 체크 API (getAdminCount)

## 비밀번호 찾기/재설정 (v4.1)
- [x] 비밀번호 재설정 토큰 DB 테이블 (passwordResetTokens)
- [x] 비밀번호 재설정 요청 API (forgotPassword - 토큰 생성)
- [x] 비밀번호 재설정 실행 API (resetPassword - 토큰 검증 + 비밀번호 변경)
- [x] 로그인 사용자 비밀번호 변경 API (changePassword)
- [x] 비밀번호 재설정 요청 UI (/forgot-password 페이지)
- [x] 비밀번호 재설정 실행 UI (/reset-password 페이지)
- [x] 로그인 페이지에 '비밀번호를 잊으셨나요?' 링크 추가
- [x] 4개 언어 번역 (한/영/중/일)

## Google OAuth Client ID 설정 (v4.1)
- [ ] Google Cloud Console에서 OAuth 2.0 클라이언트 생성 (사용자 직접 설정 필요)
- [ ] Google Client ID 서버 환경변수 설정
- [ ] Google OAuth 프론트엔드 연동 확인
- [x] AWS Lightsail 서버 재배포 (v4.1)

## v4.1 테스트
- [x] 비밀번호 재설정 프로시저 테스트 (forgotPassword, resetPassword, changePassword)
- [x] 관리자 자동 승격 DB 함수 테스트 (getAdminCount)
- [x] 라우터 구조 검증 테스트
- [x] 스키마 검증 테스트
- [x] 전체 25개 신규 테스트 통과

## Google OAuth 로그인/회원가입 버그 수정 (v4.2)
- [x] 회원가입 페이지에 Google 로그인 버튼 추가
- [x] 로그인 페이지 Google OAuth 버튼 개선 (getGoogleClientId API 연동)
- [x] Google GSI 스크립트 index.html에 추가
- [x] 서버 getGoogleClientId tRPC 프로시저 추가
- [x] env.ts에 VITE_GOOGLE_CLIENT_ID 환경변수 추가
- [x] Google 미설정 시 fallback 버튼 표시
- [x] v4.2 테스트 14개 통과
- [x] AWS Lightsail 서버 재배포

## Google OAuth Client ID 적용 (v4.3)
- [x] Manus 개발 서버에 VITE_GOOGLE_CLIENT_ID 환경변수 설정
- [x] AWS Lightsail 서버 prod.env에 VITE_GOOGLE_CLIENT_ID 추가
- [x] 서비스 재시작 및 Google Client ID API 응답 확인
- [x] v4.3 테스트 3개 통과

## Google 로그인 세션 유지 버그 수정 (v4.4)
- [x] Google 로그인 후 세션이 유지되지 않는 문제 분석 (Cloudflare Flexible SSL + sameSite:none + secure:false 쿠키 거부)
- [x] Nginx X-Forwarded-Proto https 강제 설정으로 수정
- [x] Nginx 설정 리로드 완료

## v4.4 Gemini API 연동 및 프로덕션 DB 동기화

- [x] Gemini API 연동 - LLM 호출 코드를 Gemini OpenAI 호환 엔드포인트로 수정 (thinking 파라미터 제거, resolveApiUrl 수정)
- [x] 프로덕션 DB 누락 테이블 일괄 생성 (lectureScripts, productionPipelines, voiceModProfiles, faceSwapProfiles 등) - 확인 결과 모든 테이블 이미 존재
- [x] 프로덕션 서버에 Gemini API Key 환경변수 설정
- [x] 프로덕션 서버에 수정된 코드 배포
- [x] E2E 테스트 - AI 스크립트 생성 및 전체 플로우 검증 - 성공

## v4.5 TTS 테스트, API 모니터링, 에러 핸들링 강화

- [x] TTS 음성 생성 E2E 테스트 — 생성된 스크립트로 TTS 음성 변환 정상 작동 확인 (Gemini TTS API 연동, 로컬 스토리지 폴백)
- [x] Gemini API 에러 핸들링 강화 — API 키 만료/쿼터 초과 시 사용자에게 명확한 에러 메시지 표시 (401/403/429/500 분류)
- [x] Gemini API 사용량 모니터링 — 대시보드에 API 사용량/에러율 표시 기능 추가 (apiUsageLogs 테이블, 관리자 대시보드 탭)
- [x] 프로덕션 서버 배포 및 검증 (새 서버 IP 54.151.247.194)

## v4.6 음성 목록 교체, 쿼터 알림, 오디오 품질 개선

- [x] 프론트엔드 음성 목록을 Gemini 음성으로 교체 (Alloy/Echo → Kore/Puck/Zephyr 등) - 30개 Gemini 음성 한국어 설명 포함
- [x] Google Cloud Console Gemini API 쿼터 알림 설정 가이드 페이지 추가 - 관리자 대시보드 API 모니터링 탭에 추가
- [x] TTS 오디오 품질 개선 (비트레이트 최적화, 오디오 정규화) - 192kbps MP3, loudnorm 필터 적용
- [x] 프로덕션 서버 배포 및 검증 - WorkingDirectory 수정 (/opt/aispeaker/app), Nginx 캐시 방지 헤더 추가

## v4.7 음성 미리듣기, Cloudflare 캐시 최적화, TTS 병렬 생성

- [x] 음성 미리듣기 기능 - tts.preview 프로시저 + VoicePreviewButton 컴포넌트 (ProductionStudio, InstructorVoiceProfiles, BroadcastManager)
- [x] Cloudflare Cache Rules 최적화 - 가이드 문서 작성 (HTML 우회, /assets/* 장기 캐시, /api/ 우회, /storage/ 캐시)
- [x] TTS 병렬 생성 - pipeline.start + batchStart를 Promise.allSettled + CONCURRENCY=4로 병렬화
- [x] 프로덕션 서버 배포 및 검증 - aispeaker.cc 배포 완료, tts.preview API 정상 동작 확인

## 음성 미리듣기 버그 수정
- [ ] AI Voices 갤러리 음성 미리듣기(데모) 소리가 나오지 않는 버그 수정 - sampleAudioUrl이 null이라 toast만 표시됨, 실제 TTS 데모 음성 생성 필요
- [ ] 스크립트 생성 실패 버그 수정 - 다른 계정에서 스크립트 생성 시 "스크립트 생성에 실패했습니다" 에러 발생

## 제작 이력 음성 인라인 재생 + 에러 수정
- [ ] 제작 이력 섹션 음성 클릭 시 페이지 이동 없이 인라인 재생
- [ ] 썸네일 생성 에러 수정 - BUILT_IN_FORGE_API_URL 미설정 시 Gemini 이미지 생성 폴백
- [ ] LLM 호출 시 재시도(retry) 로직 추가 (503 에러 대응)

## 아바타 시스템 구현
- [ ] AI 얼굴 갤러리 기본 아바타 선택 기능
- [ ] 사용자 사진 업로드 아바타 기능
- [ ] 기본 제공 아바타 세트 (시스템 프리셋)

## v4.5 Bug Fixes & UX Improvements
- [x] Fix faceSwapProfileId NaN error when selecting sample avatar in pipeline start
- [x] Add stop/cancel button during TTS generation (pipeline in progress)
- [ ] Deploy fixes to production (aispeaker.cc)

## v4.6 Avatar Images, Voice Demos & Cancel API
- [x] Generate AI face images for 5 sample avatars and register in DB (DB had 5, not 10)
- [ ] Generate TTS demo audio for AI Voices gallery (blocked: GEMINI_API_KEY not configured for direct TTS)
- [x] Implement server-side pipeline cancel API (pipeline.cancel procedure)
- [x] Update client stop button to call server cancel API
- [x] Tests pass (390/394, 4 pre-existing failures)
- [x] Added cancelled status to productionPipelines schema
- [x] Created apiUsageLogs table (was missing)
- [x] Cancel button in production history tab for running pipelines

## v4.7 Real-time Polling, More Avatars & Cancel Confirmation
- [x] Add real-time polling for pipeline progress (2s interval when pipelines are running)
- [x] Generate 10 new diverse AI avatar images (various ethnicities/ages)
- [x] Insert 10 new avatars into sampleFaces DB (total: 15 avatars)
- [x] Improve cancel confirmation message with detailed toast notification
- [x] Tests pass (390/394, 4 pre-existing failures)

## v4.8 Face Swap Example Images
- [x] Generate AI face swap example images (before/after) - 3 images created
- [x] Add example images section to InstructorFaceSwap page

## v4.9 Face Swap Page Enhancements
- [x] Regenerate example images with Korean text labels ('원본' / 'AI 변환') - 3 new Korean images
- [x] Add interactive before/after drag slider comparison component (BeforeAfterSlider)
- [x] Add user-generated results gallery section at page bottom with like/comment/share

## v5.0 Gallery DB, Auto Slider, Comparison Table, PIP Lecture Mode
- [x] Create faceSwapGallery DB table (user uploads, likes, comments)
- [x] Gallery backend API (CRUD, like, comment, upload before/after images)
- [x] Connect InstructorFaceSwap gallery to real DB (with sample fallback)
- [x] Before/After slider auto-animation on page load (2.5 cycles, 4s)
- [x] Face swap technology comparison table (Built-in AI / D-ID / HeyGen)
- [x] PPT + Face PIP lecture mode (Picture-in-Picture with PPT slides)
- [x] PIP mode settings (face position, size, shape, opacity)
- [x] PIP mode preview with live PPT simulation

## v5.1 PPT Upload, Drag&Drop Gallery, PIP Pipeline Integration
- [x] PPT file upload endpoint (accept .pptx/.pdf, store in S3)
- [x] PPT slide splitting (convert to individual slide images)
- [x] PIP lecture video generation from PPT slides + face avatar
- [x] DB schema for pptUploads table (slides metadata)
- [x] Gallery drag & drop image upload (replace URL input with drag&drop zones)
- [x] Gallery image upload to S3 via backend (gallery.uploadImage procedure)
- [x] Integrate PIP settings into production pipeline (pipeline.start)
- [x] PIP options in ProductionStudio video production tab (toggle + PPT select + upload)
- [x] Frontend PPT upload UI with slide preview

## v5.2 PPT Slide Preview, Batch PIP/PPT, Gallery Filter/Sort
- [x] PPT 슬라이드 썸네일 미리보기 (업로드된 PPT의 각 슬라이드를 이미지로 표시)
- [x] PPT 미리보기 UI (슬라이드 그리드 + 선택된 슬라이드 확대 모달 + 좌우 네비게이션)
- [x] 배치 제작 탭에 PIP 모드 토글 추가 (Switch 컴포넌트)
- [x] 배치 제작 탭에 PPT 파일 선택/업로드 추가 (슬라이드 미리보기 포함)
- [x] 배치 제작 batchStart에 PIP/PPT 옵션 전달 (서버 input 스키마 확장)
- [x] 갤러리 기술별 필터링 (전체/내장 AI/D-ID/HeyGen 버튼)
- [x] 갤러리 정렬 기능 (최신순/좋아요순 버튼)
- [x] 갤러리 필터/정렬 UI 컴포넌트 (Filter + ArrowUpDown 아이콘)

## v5.3 PIP Live Preview, Infinite Scroll Gallery, Auto Slide Split
- [x] PIP 실시간 미리보기 (PPT 슬라이드 위에 얼굴 오버레이 프리뷰 + PIP 배지 + 설정 정보 바)
- [x] PIP 위치/크기/모양/투명도 변경 시 실시간 반영 (pipSettingsQuery 연동)
- [x] 갤러리 무한 스크롤 (12개씩 페이지 로딩, 스크롤 시 자동 추가)
- [x] 갤러리 IntersectionObserver 기반 로딩 트리거 + 로딩/완료 상태 UI
- [x] PPTX/PDF 업로드 시 서버에서 자동 슬라이드 이미지 변환 (LibreOffice + pdf-to-png-converter)
- [x] pdf-to-png-converter 라이브러리를 이용한 PDF 페이지 이미지화 (viewportScale 2.0)
- [x] 변환된 슬라이드 이미지 S3 업로드 및 DB 저장 (slideImages 배열)

## v5.4 Browser Virtual Camera, PPT Slide Editor, PIP Drag Position
- [x] 브라우저 기반 라이브 스트리밍 페이지 (BrowserStudio.tsx - OBS 없이 플랫폼 내에서 직접 방송)
- [x] WebRTC 기반 카메라/마이크 캡처 + Canvas 합성 (PPT + 카메라 PIP 오버레이)
- [x] 가상 카메라 출력 (Canvas captureStream → Zoom/Meet 브라우저 탭 공유용)
- [x] 레이아웃 모드 (PIP 우하/좌상, 좌우 분할, 카메라만, 슬라이드만)
- [x] BroadcastManager에서 브라우저 스튜디오 진입 버튼 추가
- [x] PPT 슬라이드 순서 변경 (드래그 앤 드롭 UI - PptSlideEditorSection)
- [x] PPT 슬라이드 삭제 기능 (개별 삭제 + 확인 다이얼로그)
- [x] PPT 슬라이드 편집 서버 API (ppt.reorderSlides, ppt.deleteSlide)
- [x] PIP 드래그 위치 조정 (마우스/터치 드래그로 자유 위치 설정 - 'custom' position)
- [x] PIP 드래그 좌표를 DB에 저장 (customX/customY 퍼센트, pipSettings 스키마 확장)
- [x] BrowserStudio에서 pipSettings 로드 및 드래그 위치 자동 저장

## v5.4.1 Bugfix
- [x] faceSwapProfileId NaN 버그 수정 (pipeline.start/batchStart 서버 mutation에서 NaN 방어 처리)

## v5.5 AWS Lightsail 배포 (aispeaker.cc)
- [ ] 프로젝트 빌드 (pnpm build)
- [ ] .env.production 생성 (Manus API 환경변수 포함)
- [ ] AWS Lightsail 서버에 Docker 배포
- [ ] DB 스키마 마이그레이션
- [ ] aispeaker.cc 도메인 연결 및 SSL 설정
- [ ] 배포 검증 (HTTPS 접속 확인)
## v5.4.2 Bugfix - faceSwapProfileId NaN (프로덕션 서버)
- [x] zod 스키마에서 NaN을 undefined로 변환하는 safeOptionalNumber 적용 (pipeline.start, batchStart, avatar.generate, session.start, lecture.create, lecture.update)
- [x] 프로덕션 서버 재배포 (dist/index.js 교체 + docker restart)
## v5.4.3 Bugfix - safeOptionalNumber에서 null도 처리
- [ ] safeOptionalNumber에서 null도 undefined로 변환하도록 수정 (voiceModProfileId null 에러)
- [ ] 프로덕션 서버 재배포 (v5.4.3)
## v5.4.4 파이프라인 실패 에러 수정 + 진행률 표시 UI
- [x] 파이프라인 실행 실패 에러 수정 (원인: TTS API 한도 초과, 에러 메시지 구체적으로 표시하도록 개선)
- [x] 제작 진행률(%) 실시간 표시 UI 추가 (프로그레스 바 + 퍼센트 표시 + 자동 폴링)
## v5.4.5 Bugfix - D-ID 영상 URL 만료 + Gemini 모델 에러 + 아바타 영상 UI
- [ ] D-ID 영상 URL이 임시 서명 URL이라 24시간 후 만료됨 → 영상을 로컬 서버에 다운로드하여 영구 저장
- [ ] Gemini 이미지 생성 모델 404 에러 수정 (gemini-2.0-flash-exp → gemini-2.5-flash-preview-04-17 변경)
- [ ] 아바타 영상이 제작 이력 UI에 표시되지 않는 문제 수정

## v5.5 - D-ID + HeyGen + Seedance 2.0 통합
- [ ] HeyGen API 통합 - 아바타 강의 영상 생성 (D-ID 대안)
- [ ] Seedance 2.0 (fal.ai) API 통합 - 인트로/아웃트로/B-roll 보조 영상 생성
- [ ] 프론트엔드 UI - 아바타 엔진 선택 드롭다운 (D-ID / HeyGen)
- [ ] 프론트엔드 UI - Seedance 2.0 인트로/아웃트로 영상 생성 옵션
- [ ] API 키 환경변수 설정 (HEYGEN_API_KEY, FAL_API_KEY)
- [ ] 프로덕션 배포 및 테스트

## 전체 UI 다국어 현지화 (i18n)
- [x] LanguageContext에 vi, th 등 20개 언어 추가
- [x] 모든 페이지(40개) 한국어 하드코딩 → t() 키로 변환 및 42개 번역 파일 작성
- [x] 컴포넌트(CreditGuardModal, VoicePreviewButton, Navbar, DashboardLayout) 현지화
- [x] 빌드 및 테스트
- [x] 프로덕션 배포 (aispeaker.cc - 52.76.85.132)

## v5.6 - Kling AI + Google Veo 3.1 Avatar 엔진 연동
- [x] Kling AI API 문서 조사 및 연동 방식 파악
- [x] KLING_ACCESS_KEY / KLING_SECRET_KEY 환경변수 설정
- [x] Google Veo 3.1 API 문서 조사 및 연동 방식 파악
- [x] Kling AI JWT 인증 헬퍼 함수 구현 (server/klingai.ts)
- [x] Kling AI Avatar 영상 생성 로직 서버 코드 추가
- [x] Google Veo 3.1 영상 생성 로직 서버 코드 추가 (server/veo.ts)
- [x] DB 스키마 avatarEngine - varchar(32) 이미 유연하게 지원
- [x] pipeline.start 라우터에 Kling AI + Veo 엔진 분기 추가
- [x] 프론트엔드 UI - 아바타 엔진 선택에 Kling AI, Google Veo 추가
- [x] 다국어 번역 키 추가 (ko/en/zh/ja + 16개 언어)
- [x] vitest 테스트 작성 및 검증 (10개 테스트 통과)

## v5.6.1 - Google Veo 활성화 + v5.4.5 버그 수정 + 프로덕션 배포
- [x] GEMINI_API_KEY 환경변수 설정 (Google Veo 엔진 활성화)
- [x] D-ID 영상 URL 만료 문제 수정 (임시 서명 URL → S3 영구 저장)
- [x] Gemini 이미지 생성 모델 404 에러 수정 (gemini-2.0-flash-preview → gemini-2.5-flash-image)
- [x] 아바타 영상이 제작 이력 UI에 표시되지 않는 문제 수정 (PreviewPlayer + PipelineDashboard)
- [x] vitest 테스트 및 검증 (11개 테스트 통과)
- [x] 프로덕션 배포 (aispeaker.cc - AWS Lightsail 18.136.229.243, Docker 리빌드 완료, HTTP 200 확인)

## v5.7 - XPLAY 1분 간편 강의 3종 제작
- [x] 예쁜 여성 강사 아바타 이미지 AI 생성
- [x] XPLAY PPT 슬라이드 5장 제작
- [x] 1분 한국어 스크립트 생성 + 아바타 영상 제작
- [x] 1분 중국어 스크립트 생성 + 아바타 영상 제작
- [x] PPT + 강사 PIP 합성 영상 제작
- [x] 완성본 3종 전달

## v5.8 - Kling API 고품질 1분 강의 영상 제작
- [ ] Kling API 사양 조사 (립싱크/Image-to-Video)
- [ ] Kling API로 1분 한국어 강의 영상 생성
- [ ] 완성 영상 전달

## v5.9 - AI 목소리 갤러리 중국어 음성 추가
- [x] 중국어 음성 데이터 추가 (CN 中文 필터 시 결과 표시)

## v6.0 - AI 목소리 갤러리 대규모 개선
- [x] 각 음성별 샘플 오디오 미리듣기 생성 (92/110 성공, 나머지는 미리듣기 클릭 시 자동 생성)
- [x] 베트남어/태국어/스페인어/프랑스어/독일어/포르투갈어/러시아어/아랍어/힌디어/인도네시아어 10개 언어 추가 (총 110개 음성)
- [x] 프로덕션 서버(aispeaker.cc) 배포 - dist 배포 + DB 80개 다국어 음성 INSERT 완료 (총 110개 음성, 14개 언어)

## v6.1 - Kling API 고품질 1분 강의 영상 제작
- [ ] Kling API 사양 조사 (립싱크/Image-to-Video 엔드포인트)
- [ ] Kling API로 1분 한국어 강의 영상 생성
- [ ] 완성 영상 전달

## v6.2 - 미생성 음성 샘플 오디오 보완
- [ ] 미생성 18개 음성 식별
- [ ] Gemini TTS로 18개 샘플 오디오 일괄 생성
- [ ] DB 업데이트 (sampleAudioUrl)
- [ ] 프로덕션 DB 동기화

## v6.3 - 프로덕션 서버 PM2 전환
- [ ] PM2 설치 (프로덕션 서버)
- [ ] PM2 ecosystem 설정 파일 작성
- [ ] 기존 node 프로세스 → PM2 전환
- [ ] 서버 재부팅 시 자동 시작 설정 (pm2 startup)
- [ ] PM2 정상 동작 확인

## v6.2 - 직접 스크립트 사용 기능 + 음성 샘플 보완

- [x] Studio 페이지에 '내 스크립트로 강의 생성' 버튼 추가 (AI 생성 없이 사용자 입력 텍스트 그대로 TTS 변환)
- [x] 백엔드에 직접 스크립트 사용 라우터 추가 (script.createDirect)
- [ ] 미생성 18개 음성 샘플을 Forge 내장 TTS 또는 대안 API로 생성
- [x] PM2 전환 불필요 확인 (Docker unless-stopped + healthcheck으로 이미 동일 기능)
- [x] 푸터 "© 2026 Manus" → "© 2026 AI Speaker" 변경 + ManusDialog 텍스트 수정

## v6.3 - 프로덕션 배포 + Kling 영상 + 스크립트 편집 강화

- [x] 프로덕션 서버(aispeaker.cc)에 v6.2 빌드 및 배포 - Docker 리빌드 완료, healthy 상태
- [ ] Kling API 크레딧 부족 - 충전 필요 (1102 Account balance not enough)
- [x] Studio 스크립트 미리보기/수정 기능 강화 (섹션 추가/삭제, 시간 슬라이더, 미리보기 모드, 시간 분배 바, 전체 복사)
- [x] Kling 웹 UI로 한국어 아바타 강의 영상 생성 완료 (57.9초, 960x960, H.264 30fps)
- [x] Kling 영상 CDN 업로드 완료
- [x] 미생성 18개 음성 샘플 Gemini TTS로 전량 생성 완료 (18/18 성공, 총 110개 음성 모두 오디오 보유)

## v7.0 - 강의 제작 UI 대폭 리디자인 (수동 컨트롤 방식)

### 새로운 강의 프로젝트 DB 스키마
- [x] lectureProjects 테이블 (강의 프로젝트 메타데이터)
- [x] projectAvatars 테이블 (프로젝트별 아바타 설정, 다중 아바타 지원)
- [x] projectSlides 테이블 (업로드된 슬라이드 이미지)
- [x] slideScripts 테이블 (슬라이드별 스크립트 매칭)
- [x] slideAnnotations 테이블 (슬라이드별 펜 애니메이션/주석)
- [x] DB 마이그레이션 실행

### Step 1: 아바타 선택 페이지
- [x] 기존 sampleFaces 갤러리에서 아바타 선택 UI
- [ ] 사진 업로드로 커스텀 아바타 추가
- [x] 다중 아바타 선택 (2~3명 강의 지원)
- [x] 각 아바타에 이름/역할 부여 (강사, 사회자, 게스트 등)
- [x] 아바타별 음성 선택

### Step 2: 스크립트 관리 페이지
- [x] AI 스크립트 생성 모드 (프롬프트 → 섹션별 스크립트)
- [x] 스크립트 분류 모드 (긴 텍스트를 섹션으로 자동 분류)
- [x] 스크립트 직접 입력 모드 (섹션별 수동 입력)
- [x] 섹션 추가/삭제/편집/재배치

### Step 3: 슬라이드 업로드
- [x] PPT/PDF/이미지 파일 업로드 (드래그&드롭)
- [x] 업로드된 파일 자동 이미지 변환 (PPT→이미지, PDF→이미지)
- [x] 슬라이드 썸네일 그리드 표시
- [x] 슬라이드 순서 변경/삭제

### Step 4: 스크립트-슬라이드 매칭 에디터
- [x] 좌측: 슬라이드 목록 (썸네일)
- [x] 우측: 스크립트 섹션 목록
- [x] 드래그&드롭으로 스크립트를 슬라이드에 배치 (클릭 배치 방식)
- [x] 각 슬라이드별 아바타 선택 드롭다운
- [x] 각 슬라이드별 펜 애니메이션 설정 (동그라미/화살표/체크/자유그리기)
- [x] 펜 색상/두께 설정
- [x] 펜 애니메이션 위치 지정 (슬라이드 위 클릭)

### Step 5: 미리보기 및 최종 설정
- [x] 아바타 위치 설정 (하단/우하단/좌하단/없음)
- [x] 아바타 크기/모양/투명도 설정
- [x] 전체 강의 미리보기 (슬라이드+스크립트+아바타 합성 프리뷰)
- [x] 최종 영상 생성 요청

### 백엔드 API (tRPC)
- [x] lectureProject CRUD 프로시저
- [x] projectAvatar CRUD 프로시저
- [x] projectSlide 업로드/변환/관리 프로시저
- [x] slideScript 매칭/관리 프로시저
- [x] slideAnnotation 저장/조회 프로시저

### 테스트
- [x] 새 DB 스키마 테스트
- [x] 프로시저 입력 검증 테스트
- [x] 권한 검증 테스트

## v7.1 업그레이드 - Step3/4/5 고도화

### Step 3: PPT/PDF 자동 이미지 변환
- [x] PPT/PDF 파일 서버사이드 변환 (convertFile 프로시저 연동)
- [x] 변환 진행 상태 UI (로딩 인디케이터 + 상태 메시지)
- [x] 이미지 파일과 PPT/PDF 파일 자동 분기 처리
- [x] 50MB 파일 크기 제한 적용
- [x] 드래그&드롭 + 파일 선택 지원

### Step 4: 캔버스 기반 펜 그리기 도구
- [x] HTML5 Canvas 실제 드로잉 구현 (기존 DOM 오버레이 → Canvas 2D)
- [x] 자유 그리기(freehand) - 마우스 드래그로 실시간 선 그리기
- [x] 화살표(arrow) - 드래그로 시작점→끝점 화살표 그리기
- [x] 동그라미(circle) - 클릭 위치에 원 그리기
- [x] 체크(check)/밑줄(underline) - 클릭 위치에 표시
- [x] 실시간 드로잉 미리보기 (그리는 중 즉시 표시)
- [x] Undo 기능 (마지막 그리기 취소)
- [x] 전체 삭제 기능 (현재 슬라이드 모든 펜 그리기 삭제)
- [x] saveCanvasDrawing 프로시저 연동 (DB 저장)
- [x] 저장된 어노테이션 Canvas에 렌더링 (freehand/circle/arrow/check/underline)
- [x] 슬라이드별 어노테이션 개수 표시 (썸네일 배지)

### Step 5: 영상 생성 백엔드 연동
- [x] 배경음악(BGM) 업로드 기능 (uploadBgm 프로시저 연동)
- [x] BGM 미리듣기 + 볼륨 조절 슬라이더
- [x] 슬라이드 선택 기능 (영상에 포함할 슬라이드 체크박스)
- [x] 전체 선택/해제 버튼
- [x] 선택된 슬라이드만 미리보기 재생
- [x] generateVideo 프로시저 연동 (실제 Kling/DID API 호출)
- [x] 영상 생성 중 로딩 상태 표시
- [x] 생성된 영상 비디오 플레이어 + 다운로드 버튼
- [x] 프로젝트 상태 표시 (생성 중/완료/오류)

### 서버 수정
- [x] routers.ts DB 필드명 불일치 수정 (saveCanvasDrawing, generateVideo)
- [x] LLM response content 타입 캐스팅 수정

### 테스트
- [x] v7.1 테스트 12개 통과 (convertFile, saveCanvasDrawing, uploadBgm, generateVideo, deleteAnnotation)

## v7.2 업그레이드 - 터치 드로잉, 진행률 폴링, PPT 텍스트 추출

### Step 4: 모바일/태블릿 터치 드로잉 지원
- [x] Canvas에 touchstart/touchmove/touchend 이벤트 추가
- [x] 터치 좌표를 마우스 좌표와 동일하게 변환
- [x] 터치 시 스크롤 방지 (touch-action: none)
- [x] 모바일에서 드로잉 도구 UI 반응형 처리

### Step 5: generateVideo 실시간 진행률 폴링
- [x] 백엔드: 프로젝트 상태 폴링 프로시저 추가 (getVideoProgress)
- [x] 프론트엔드: 영상 생성 중 주기적 폴링 (3초 간격)
- [x] 진행률 프로그레스 바 UI 표시
- [x] 완료/오류 시 자동 폴링 중지

### Step 3: PPT 텍스트 추출 → 스크립트 초안
- [x] 백엔드: convertFile에서 텍스트 추출 기능 추가
- [x] 추출된 텍스트를 슬라이드별 스크립트 초안으로 자동 매핑
- [x] 프론트엔드: 변환 완료 후 "텍스트 추출 → 스크립트 초안" 버튼 표시
- [x] 추출된 스크립트를 Step2 스크립트 섹션에 자동 반영

### 테스트
- [x] v7.2 테스트 작성 및 통과 (14개 테스트 통과)

## v7.3 업그레이드 - 지우개/색상, 히스토리, AI 스크립트 개선

### Step 4: 지우개 도구 + 커스텀 색상 선택기
- [x] 지우개 도구 추가 (클릭 위치 근처 어노테이션 삭제, 마우스+터치 지원)
- [x] 커스텀 색상 선택기 (input type=color + conic-gradient 버튼)
- [x] 도구바 UI에 지우개/색상 통합

### 영상 생성 히스토리 페이지
- [x] DB 스키마: videoGenerations 테이블 추가 (생성 이력 저장)
- [x] 백엔드: 영상 생성 시 이력 저장 + 목록 조회 프로시저
- [x] 프론트엔드: /video-history 히스토리 페이지 (재생/다운로드/삭제)
- [x] 각 영상 재생/다운로드/삭제 기능

### AI 스크립트 개선 버튼
- [x] 백엔드: LLM 호출하여 스크립트 텍스트를 강의용으로 개선하는 improveScript 프로시저
- [x] 프론트엔드: Step2 각 섹션에 "AI 스크립트 개선" 버튼 + 4가지 스타일 선택
- [x] 개선 전/후 비교 모달 + 적용/취소 UI

### 테스트
- [x] v7.3 테스트 작성 및 통과 (12개 테스트 통과)

## v7.4 - 전체 AI 스크립트 일괄 개선
- [x] 백엔드: improveAllScripts 프로시저 (여러 섹션 순차 LLM 호출)
- [x] 프론트엔드: "전체 AI 스크립트 개선" 버튼 + 진행률 표시
- [x] 전체 개선 전/후 비교 모달 (일괄 적용/취소)
- [x] vitest 테스트 작성 및 통과 (6개 테스트 통과)

## v7.5 - 선택적 일괄 개선 + AI 이력 저장 + 배포
- [x] 프론트엔드: 섹션별 체크박스 추가 (전체선택/해제) + 선택 상태 하이라이트
- [x] 선택된 섹션만 improveAllScripts에 전달 (미선택 시 전체 개선)
- [x] DB 스키마: scriptImprovementHistory 테이블 추가
- [x] 백엔드: 개선 시 이력 자동 저장 (batchId로 그룹핑)
- [x] 백엔드: getImprovementHistory + revertImprovement 프로시저
- [x] 프론트엔드: 이력 보기 패널 + batchId별 그룹 표시 + 되돌리기 버튼
- [x] vitest 테스트 작성 및 통과 (14개 테스트 통과)
- [ ] aispeaker.cc 배포 안내

## v7.6 - 이력 상세 모달 + 자동 저장 + 버전 관리
- [x] 이력 항목 클릭 시 섹션별 원본/개선 나란히 비교 상세 모달 (2칸 그리드 + 변경 배지)
- [x] 스크립트 편집 중 30초 debounce 자동 저장 (useEffect + setTimeout)
- [x] 자동 저장 상태 표시 (저장 중 스피너 / 완료 체크 + 시간)
- [x] DB 스키마: slideScriptVersions 테이블 추가 (프로젝트 단위 스냅샷)
- [x] 백엔드: saveScriptVersion/listScriptVersions/restoreScriptVersion 프로시저
- [x] 프론트엔드: 수동 저장 시 자동 버전 생성 + 버전 이력 패널 + 복원 버튼
- [x] vitest 테스트 작성 및 통과 (11개 테스트 통과)

## 네비게이션 메뉴 축소 및 버그 수정

- [x] 네비게이션 메뉴 축소: 홈 제거(로고 클릭으로 대체), 주요 메뉴(강의 제작, DID-AI얼굴/AI목소리)만 표시, 나머지 햄버거 메뉴
- [x] PDF 변환 오류 수정: 프로덕션 서버에 poppler-utils, pdf-lib, sharp 설치
