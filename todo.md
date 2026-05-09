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
- [x] 아바타 선택 화면의 음성 선택에 미리듣기(재생) 버튼 추가
- [x] KLING으로 새 AI 강사(아바타) 만들기 기능 추가 (KLING API 서버 모듈, DB 스키마, tRPC 라우터, 프론트엔드 UI 완료)
- [x] 아바타 선택 화면의 음성 선택에 미리듣기(재생) 버튼 추가
- [x] PPTX 파일 업로드 변환 오류 수정 (프로덕션 서버에 libreoffice 설치)
## KLING AI 영상 생성 기능 강화 (v5.4)
- [x] KLING AI 생성 영상을 강의 아바타로 바로 사용할 수 있는 기능 구현
- [x] KLING AI 영상 만들기에 이미지 업로드 시 화면 비율 조절 옵션 추가 (6종: 16:9, 9:16, 1:1, 4:3, 3:4, 2:3)
- [x] KLING AI 영상 만들기에 다양한 영상 스타일 선택 옵션 추가 (7종: 자연스러운, 프로페셔널, 캐주얼, 에너지틱, 학술적, 스토리텔러, 커스텀)

## 강의 포맷 템플릿 시스템 (v5.4)
- [x] 강의 포맷 템플릿 DB 테이블 및 시드 데이터 (15개 템플릿)
- [x] 인원 구성 포맷: 강사 단독, 강사+MC+통역 3인, 강사+게스트 대담, 패널 토론
- [x] 강의 스타일 포맷: PPT 강의, 화이트보드 강의, PPT+화이트보드 혼합, 전면 강사, 화면 공유
- [x] 중간 삽입 요소: 질문자 삽입, 휴식 화면, 데모 영상, 요약 슬라이드, 퀴즈/투표, 인트로/아웃트로
- [x] 원클릭 포맷 선택 UI (카드형 선택 → 자동 세팅) - LectureFormatSelector 컴포넌트
- [x] LectureBuilder에서 포맷 선택 시 프로젝트 생성 다이얼로그 통합

## v5.5 업데이트
- [x] 프로덕션 서버 배포 (AWS Lightsail - aispeaker.cc) - dist 교체, jsonwebtoken 설치, DB 마이그레이션, 시드 데이터 삽입 완료
- [x] 포맷 선택 시 아바타 슬롯 자동 생성 (인원 구성에 맞게) - personnelConfig 기반 역할별 아바타 자동 생성
- [x] 포맷 선택 시 스크립트 섹션 프리셋 (포맷에 맞게) - 도입/본문/삽입요소/마무리 자동 구성
- [x] KLING API 키 실제 테스트 및 동작 검증 - JWT 인증 성공, Image-to-Video 및 Text-to-Video 작업 생성 성공, 상태 조회 성공

## v5.6 업데이트
- [x] 프로덕션 서버 재배포 (aispeaker.cc에 포맷 자동 구성 기능 반영) - HTTP 200 정상
- [x] KLING 생성 영상 미리보기 비디오 플레이어 추가 - 전체화면 플레이어, 호버 재생, 정보 표시
- [x] KLING 생성 영상 다운로드 기능 추가 - 미리보기 다이얼로그에서 직접 다운로드 + 아바타 등록
- [x] 포맷 템플릿 관리자 백오피스 - 템플릿 목록/추가/수정/삭제 CRUD + 복제 기능
- [x] 포맷 템플릿 관리자 백오피스 - 카테고리별 필터, JSON 설정 편집, AdminDashboard 연동

## v5.7 업데이트
- [x] 프로덕션 서버 v5.6 재배포 (aispeaker.cc) - HTTP 200 정상, 서비스 active
- [x] KLING 영상 생성 자동 폴링 (진행중 작업 8초마다 자동 상태 확인, 진행바 표시)
- [x] KLING 영상 완료 시 자동 새로고침 및 알림 (toast) - 완료/실패 자동 감지 및 알림
- [x] 포맷 템플릿 레이아웃 미리보기 - 화면 레이아웃(슬라이드/화이트보드/PIP/전면강사/화면공유), 인원 아바타, 타임라인 미리보기

## v5.8 업데이트
- [x] 프로덕션 서버 v5.7 배포 (aispeaker.cc) - HTTP 200 정상, active
- [x] AI 스크립트 초안 자동 생성 - 포맷 기반 LLM 생성 (아바타 역할/섹션 구조 반영, speaker/type 태그)
- [x] AI 스크립트 생성 UI - 포맷 기반 토글, 추가 언어(vi/th), 추가 섹션 생성 버튼
- [x] 강의 영상 MP4 내보내기 - ffmpeg 기반 영상 합성, 해상도 선택(720p/1080p/1440p), 자막 옵션, S3 업로드
- [x] MP4 내보내기 UI - 해상도 선택, 자막 토글, 진행바, 다운로드/URL복사 버튼
- [x] 프로덕션 서버 v5.8 배포 (aispeaker.cc) - HTTP 200 정상, active, fluent-ffmpeg+ffmpeg 설치 완료

## v5.9 버그 수정
- [x] PPTX 파일 업로드 실패 수정 - Nginx client_max_body_size 100M 설정 (기존 1MB 기본값으로 HTTP 413 에러 발생)

## v5.9 AI 스크립트 교정 및 스타일 필터
- [x] AI 스크립트 교정 백엔드 - LLM 기반 문장 교정/다듬기 tRPC 라우터 (proofreadScript)
- [x] AI 스타일 필터 백엔드 - 부드럽게/뉴스체/발표체/대화체/극적/간결 6종 스타일 변환
- [x] AI 교정 버튼 UI - 각 슬라이드 스크립트에 원클릭 교정 버튼 (Step2)
- [x] AI 스타일 필터 UI - 토글 버튼으로 스타일 선택 후 변환
- [x] 교정 전/후 비교 미리보기 다이얼로그
- [x] 프로덕션 배포 (aispeaker.cc) - HTTP 200 정상

## v6.0 아바타 오버레이 & 중간 콘텐츠 삽입
- [x] 슬라이드별 아바타 크기/위치 조정 DB 스키마 (slideAvatarOverrides 테이블)
- [x] 슬라이드별 아바타 크기/위치 조정 백엔드 라우터 (upsertAvatarOverride)
- [x] 슬라이드별 아바타 크기/위치 조정 UI (슬라이더 + 프리뷰)
- [x] 아바타 모양 선택 (원형/둥근사각/사각)
- [x] 아바타 투명도 조정
- [x] 중간 삽입 콘텐츠 DB 스키마 (slideInsertContent 테이블)
- [x] 중간 삽입 콘텐츠 백엔드 CRUD 라우터
- [x] 중간 삽입 콘텐츠 UI (화이트보드/영상/이미지/디자인 추가)
- [x] AI 화이트보드 프롬프트 생성 (generateWhiteboardContent)
- [x] Step4 매칭에디터에 아바타 설정/삽입 콘텐츠 패널 추가
- [x] 미리보기에 아바타 오버레이 반영
- [x] 프로덕션 배포 (aispeaker.cc) - HTTP 200 정상

## v6.0 고급 화이트보드 & 화면 편집
- [x] 화이트보드 캔버스 에디터 - 펜/지우개/색상/두께 도구 (WhiteboardEditor 컴포넌트)
- [x] 화이트보드 펜 애니메이션 녹화 - 스트로크 타임스탬프 기록, 재생 기능
- [x] 화이트보드 AI 프롬프트 생성 - 텍스트 입력으로 글씨/다이어그램 자동 생성
- [x] 화이트보드 텍스트 타이핑 - 메모장처럼 텍스트 입력/편집
- [x] 화이트보드 이미지 삽입 - URL로 이미지 배치/리사이즈
- [x] 중간 삽입 콘텐츠 관리 UI - 슬라이드 사이에 화이트보드/영상/이미지 추가
- [x] 화이트보드 데이터 저장/로드 백엔드 (createInsertContent/updateInsertContent)

## v6.1 화이트보드 MP4 & 슬라이드 전환 효과 & AI 이미지 생성
- [x] 화이트보드 펜 애니메이션 MP4 내보내기 - 서버 ffmpeg 기반 캔버스 프레임 렌더링
- [x] 화이트보드 MP4 내보내기 UI - 진행바, 다운로드, 강의 영상 자동 삽입
- [x] 슬라이드 전환 효과 DB 스키마 - slideTransitions 테이블
- [x] 슬라이드 전환 효과 백엔드 - upsertSlideTransition/setAllTransitions 라우터
- [x] 슬라이드 전환 효과 UI - 10종 타입 + 지속시간/이징 설정 + 전체적용
- [x] 슬라이드 전환 효과 MP4 반영 - videoExporter에 전환 효과 적용 로직 통합
- [x] AI 이미지 생성 백엔드 - generateWhiteboardImage (7종 스타일)
- [x] AI 이미지 생성 UI - 프롬프트 + 스타일 선택 + 화이트보드 자동 삽입
- [x] 프로덕션 배포 v6.1 (aispeaker.cc - IP 52.76.85.132, 싱가포르 리전) - HTTP 200 정상
- [x] v6.1 테스트 14개 통과
## v6.2 미리보기 전환 효과 & 화이트보드 템플릿 & 프로젝트 복제
- [x] 미리보기(Step5)에서 슬라이드 전환 시 CSS 애니메이션 실시간 프리뷰
- [x] 전환 효과 타입별 CSS 애니메이션 구현 (페이드/슬라이드/줌/와이프/디졸브)
- [x] 화이트보드 템플릿 라이브러리 - 8종 (빈화이트보드/칠판/비교표/타임라인/마인드맵/핵심포인트/차트영역/다크모던)
- [x] 화이트보드 템플릿 선택 UI - 접이식 그리드 패널, 원클릭 적용
- [x] 강의 프로젝트 복제 백엔드 - cloneLectureProject (슬라이드/스크립트/아바타/주석/오버라이드/삽입콘텐츠/전환효과 전체 딥카피)
- [x] 강의 프로젝트 복제 UI - 프로젝트 카드 호버 시 복제 버튼 (Copy 아이콘)
- [x] v6.2 테스트 15개 통과
- [x] 프로덕션 배포 v6.2 (aispeaker.cc - IP 52.76.85.132, 싱가포르 리전) - HTTP 200 정상, DB 마이그레이션 적용 완료

## v6.3 화이트보드 협업 & AI 슬라이드 레이아웃 & 워터마크/브랜딩
### 화이트보드 실시간 협업 (WebSocket)
- [x] WebSocket 서버 설정 (ws 패키지, /ws/whiteboard 경로)
- [x] 화이트보드 세션 관리 DB 스키마 (whiteboardSessions 테이블)
- [x] 협업 세션 생성/참여/종료 백엔드 라우터 (collab.createSession/joinSession/endSession)
- [x] 실시간 드로잉 동기화 (스트로크/텍스트/도형 브로드캐스트)
- [x] 참여자 커서 위치 실시간 표시 (10색 순환 배정)
- [x] 참여자 목록 및 색상 구분 (useWhiteboardCollab 훅)
- [x] WhiteboardEditor에 협업 모드 UI 통합 (협업 시작/종료/참여 버튼, 참여자 표시)
- [x] 세션 초대 링크 생성 및 공유 (클립보드 복사)

### AI 자동 슬라이드 레이아웃 추천
- [x] 스크립트 분석 → 레이아웃 추천 백엔드 라우터 (LLM invokeLLM + JSON Schema)
- [x] 레이아웃 타입 13종 정의 (title_only/title_subtitle/title_body/title_bullets/comparison/image_left/image_right/image_full/quote/chart/diagram/timeline/blank)
- [x] 슬라이드별 최적 레이아웃 자동 매칭 (slideLayouts DB 테이블)
- [x] 레이아웃 추천 결과 UI (Step5 미리보기에서 원클릭 적용)
- [x] 전체 프로젝트 일괄 레이아웃 추천 (분석 시작 버튼)

### 강의 영상 워터마크/브랜딩
- [x] 워터마크 설정 DB 스키마 (projectWatermarks 테이블)
- [x] 워터마크 CRUD 백엔드 라우터 (watermark.get/upsert/uploadLogo)
- [x] 로고 이미지 워터마크 (위치/크기/투명도 설정)
- [x] 텍스트 워터마크 (폰트/색상/위치 설정)
- [x] 워터마크 설정 UI (Step5 설정 패널에 통합)
- [ ] MP4 내보내기 시 워터마크 자동 합성 (ffmpeg) - 향후 구현 예정
- [x] 워터마크 실시간 미리보기 (Step5 설정 패널 내 미니 프리뷰)

### 테스트 및 배포
- [x] v6.3 vitest 테스트 33개 통과
- [x] 프로덕션 배포 v6.3 (aispeaker.cc - HTTP 200, DB 마이그레이션 4테이블 적용 완료)

## v7.0 Akool API 연동 & 디자인 리뉴얼 & 기능 확장

### Akool API 연동
- [x] Akool API 키 설정 (webdev_request_secrets) - AKOOL_API_KEY 검증 완료
- [x] Akool API 백엔드 래퍼 모듈 (server/akool.ts) - I2V, FaceSwap, Avatar, Translation
- [x] 이미지→비디오 (I2V) API 연동
- [x] 텍스트→비디오 (T2V) API 연동 (I2V 라우터 통합)
- [x] 얼굴 교환 (Face Swap) API 연동 - Pro/Plus 두 모드
- [x] 비디오 번역 (Video Translation) API 연동 - 15+ 언어
- [x] 음성 복제 (Voice Clone) API 연동 (Talking Avatar 통합)
- [x] 스트리밍 아바타 API 연동 (Talking Avatar 통합)
- [x] 효과 프리셋 (Effects) 연동 - getEffects 라우터

### Akool 스타일 디자인 리뉴얼
- [x] 다크 테마 기반 홈페이지 리디자인 (Akool 스타일 - 딥 블랙 + 네온 그라데이션)
- [x] 히어로 섹션 - 애니메이션 카르셀 + 통계 카운터
- [x] 그라데이션 + 글래스모피즘 카드 디자인
- [x] AI 제품 쇼케이스 그리드 (6종 제품 카드)
- [x] 고객 로고 섹션 (Fortune 500 스타일)
- [x] CTA 섹션 - 그라데이션 배경 + 시작하기 버튼
- [ ] 모델 선택 캐러셀 (멀티모델 브랜드 로고 슬라이더) - 향후
- [ ] 효과 갤러리 (프리셋 비디오 그리드) - 향후
- [ ] 가격 플랜 비교 테이블 - 향후

### 새 기능 페이지
- [x] AI Studio 페이지 (/ai-studio) - 4탭 통합 (I2V, FaceSwap, Avatar, Translation)
- [x] Image to Video 탭 - 이미지 URL, 프롬프트, 해상도/길이, 효과 프리셋
- [x] Face Swap 탭 - Pro/Plus 모드, 소스/타겟 이미지, 페이스 인한스
- [x] Talking Avatar 탭 - 아바타 선택, 스크립트, 음성, 배경
- [x] Video Translation 탭 - 비디오 URL, 15+ 언어 선택
- [x] 실시간 폴링 상태 표시 (pending/processing/completed/failed)
- [x] Navbar에 AI Studio 링크 추가

### 테스트 및 배포
- [x] v7.0 vitest 29개 테스트 통과
- [x] 프로덕션 배포 v7.0 (aispeaker.cc - HTTP 200 정상, WebSocket 초기화 확인)

## v7.1 멀티모델 캐러셀 & 효과 프리셋 갤러리

### 멀티모델 선택 캐러셀
- [x] 모델 브랜드 데이터 정의 (Akool/Kling 3.0/Wan 2.7/Seedance 2.0/Sora/Veo/MiniMax/FLUX/DALL-E 3 등 10종)
- [x] 모델별 스펙 비교 데이터 (해상도/길이/속도/가격/특징/강점)
- [x] 자동 슬라이딩 로고 캐러셀 컴포넌트 (embla-carousel-autoplay 무한 루프)
- [x] 모델 선택 시 상세 비교 카드 확장 (그라데이션 카드 + 특징/강점 태그)
- [x] 모델별 비교 테이블 (사양/가격/특징 비교 - showComparison 플래그)
- [x] 홈페이지에 멀티모델 캐러셀 섹션 추가
- [x] AI Studio에 AI Models 탭 추가 (모델 비교 통합)

### 효과 프리셋 비디오 갤러리
- [x] 효과 프리셋 데이터 12종 정의 (Kiss Screen/Catwalk/360 Orbit/Zoom In/Pan/Tilt/Dolly/Parallax/Glitch/Cinematic/Slow Motion/Time Lapse)
- [x] 비디오 미리보기 그리드 컴포넌트 (CSS 애니메이션 프리뷰 + 호버 효과)
- [x] 효과 카테고리 필터 (All/Motion/Camera/Style/Special)
- [x] 효과 상세 모달 (설명/파라미터/태그/난이도/인기도)
- [x] 홈페이지에 효과 갤러리 섹션 추가
- [x] AI Studio에 Effects 탭 추가 (효과 갤러리 통합)

### 테스트 및 배포
- [x] v7.1 vitest 18개 테스트 통과 (v7.1-ui.test.ts)
- [x] 프로덕션 배포 v7.1 (aispeaker.cc - HTTP 200 정상, /opt/aispeaker/app active running)

## v8.0 Akool 비교분석 기반 UI 고급화 & 메뉴 세분화 & 기능 이식
### 비교분석 보고서
- [x] Akool 플랫폼 심층 분석 (25개+ 도구, 14 비디오 모델, 10 이미지 모델, 메가메뉴 구조)
- [x] 기능 이식 가능성 매트릭스 작성 (즉시/중간/어려움 분류)
- [x] 경쟁 특화 전략 수립 (AI 강의 제작 특화 포지셔닝)

### UI 고급화 Phase 1 - 글로벌 디자인 시스템
- [x] CSS 변수 리뉴얼 - Akool 스타일 보라/시안 그라데이션 강화
- [x] 글래스모피즘 카드 + 네온 보더 효과 강화
- [ ] 타이포그래피 시스템 개선 (Inter/Pretendard 폰트) - 향후
- [ ] 홈페이지 히어로 업그레이드 - 3D 파티클 + 타이핑 애니메이션 - 향후

### UI 고급화 Phase 2 - 메가메뉴 & 네비게이션 재구성
- [x] 사이드바 네비게이션 구현 (StudioLayout - 카테고리 분류)
- [x] Hot/New/Unlimited 배지 시스템
- [x] 도구별 개별 페이지 라우팅 (13개 서브 라우트)
- [ ] 제품 탭 쇼케이스 (Akool 스타일 탭 전환 데모) - 향후

### 기능 이식 Phase 1 - 새 API 연동
- [ ] Video to Video (V2V) API 연동 + UI - 향후
- [ ] Reference to Video API 연동 + UI - 향후
- [x] TTS (텍스트→음성) Gemini TTS 연동 + UI (30종 음성, 속도 조절)
- [x] 음성 복제 - LLM 기반 음성 매칭 + Gemini TTS 생성
- [x] 음성 변환기 - 음성 인식(STT) + 타겟 음성 TTS 변환
- [x] 이미지 생성 - Gemini/Forge 이미지 생성 (7종 스타일)
- [x] 배경 제거/교체 - AI 이미지 편집 기반
- [x] 라이브 카메라 - Coming Soon 프리뷰 페이지
- [x] 스트리밍 아바타 - Coming Soon 프리뷰 페이지

### 기능 이식 Phase 2 - 추가 페이지
- [ ] 커뮤니티 갤러리 페이지 (사용자 생성 콘텐츠 공유) - 향후
- [ ] 가격 플랜 비교 페이지 (Stripe 결제 연동) - 향후

### 테스트 및 배포
- [x] v8.0 vitest 21개 테스트 통과 (v8.0-features.test.ts)
- [ ] 프로덕션 배포 v8.0

## v8.1 - 커뮤니티 갤러리 + V2V + 크레딧 시스템

### 커뮤니티 갤러리
- [x] DB 스키마: galleryPosts 테이블 + 기존 galleryLikes/galleryComments 활용
- [x] 백엔드: community tRPC 라우터 (list/create/like/comment/view)
- [x] 프론트엔드: CommunityGallery.tsx - Masonry 그리드 + 좋아요/댓글
- [x] 프론트엔드: 게시물 상세 모달 (좋아요/댓글)
- [x] 프론트엔드: 내 작품 업로드 기능 (S3 연동)

### Video-to-Video (V2V)
- [x] Kling Video Effects API 연동 (263가지 이펙트)
- [x] VideoEffectsStudio.tsx 전용 UI 페이지 구현
- [x] useQuery refetchInterval 폴링 기반 결과 조회

### 크레딧 시스템 + Stripe 결제
- [x] DB: creditUsageLogs enum 확장 (9개 신규 AI Studio 기능)
- [x] 백엔드: CREDIT_COSTS 확장 + useCredits 프로시저 enum 확장
- [x] AI 도구 사용 시 크레딧 차감 (credit.useCredits 프로시저)
- [x] Stripe Checkout 세션 (createCreditCheckout - 기존 연동 활용)
- [x] Stripe Webhook 처리 (기존 연동 활용)
- [x] 프론트엔드: Pricing 페이지 크레딧 비용 표 업데이트 (17개 기능)
- [x] 프론트엔드: 기존 Pricing/결제 시스템 활용

### 테스트 및 배포
- [x] v8.1 vitest 11개 테스트 통과 (v8.1-features.test.ts)
- [ ] 프로덕션 배포 v8.1

## v8.2 - 크레딧 자동 차감 + 갤러리 공유 + 대시보드 위젯

### 크레딧 자동 차감 연동
- [x] useCreditDeduction 커스텀 훅 구현 (deductAndRun 패턴)
- [x] InsufficientCreditsDialog 컴포넌트 (크레딧 부족 시 충전 유도)
- [x] 모든 AI Studio 탭에 크레딧 차감 연동 (TTS, VoiceClone, VoiceChange, ImageGen, BgRemove, VideoEffects)

### 갤러리→AI Studio 원클릭 공유
- [x] ShareToGalleryButton 공통 컴포넌트 생성
- [x] AI Studio 각 결과에 갤러리 공유 버튼 (TTS, VoiceClone, VoiceChange, ImageGen, BgRemove, VideoEffects)
- [x] community.create mutation 연동 + 성공 시 toast 알림

### 사용자 대시보드 크레딧 위젯
- [x] CreditDashboard 페이지 (/credits) - 잔액 + Progress bar
- [x] 기간별 사용량 통계 (7일/30일/전체)
- [x] 기능별 사용량 막대 그래프 (12개 기능 아이콘)
- [x] 최근 사용 내역 리스트 (20건)
- [x] 충전/AI Studio/갤러리 바로가기 카드
- [x] StudioLayout 크레딧 표시 → 대시보드 링크 연결

### 테스트 및 배포
- [x] v8.2 vitest 11개 테스트 통과 (v8.2-features.test.ts)
- [ ] 프로덕션 배포 v8.2

## v8.3 - 사용자 프로필 + AI 히스토리 + 관리자 매출 분석

### 사용자 프로필 페이지
- [x] 프로필 정보 표시 (이름, 이메일, 가입일, 역할)
- [x] 구독/크레딧 현황 요약 카드
- [x] 내 작품 갤러리 (최근 공유한 콘텐츠)
- [x] 계정 설정 (닉네임 변경, 소개 편집)
- [x] /profile 라우트 등록

### AI Studio 결과물 히스토리
- [x] aiGenerations DB 테이블 (생성 이력 저장) + 마이그레이션 적용
- [x] aiHistory.list tRPC 프로시저 (tool 필터 + 페이지네이션)
- [x] AiHistory.tsx 페이지 (도구별 필터, 날짜 정렬, 10개 도구 레이블)
- [x] 결과물 다운로드 링크
- [x] /ai-history 라우트 등록

### 관리자 대시보드 매출 분석
- [x] adminAnalytics tRPC 라우터 (creditSales/toolUsage/userStats)
- [x] 크레딧 판매 현황 (일/주/월별 Select)
- [x] 인기 도구 순위 막대 그래프 (10개 도구)
- [x] 사용자 통계 (DAU/WAU/MAU/신규가입) 5개 카드
- [x] /admin/analytics 라우트 등록 + admin 권한 가드

### 테스트 및 배포
- [x] v8.3 vitest 13개 테스트 통과 (v8.3-features.test.ts)
- [ ] 프로덕션 배포 v8.3

## v8.4 - 아바타 드래그 + 통역 스크립트 + 강사 녹화 + 번역 완벽화

### 아바타 위치 마우스 드래그 조정
- [x] 아바타 플레이스홀더를 마우스 드래그로 자유롭게 이동 가능하게
- [x] 드래그 위치 저장 (슬라이드별 아바타 좌표 기억)
- [x] 리사이즈 핸들 추가 (크기 조절도 드래그로)

### 통역용 스크립트 기능
- [x] 원문 강사 스크립트 + 통역 스크립트 분리 입력 UI
- [x] 원문→통역 순서 재생 모드 추가
- [x] 통역 언어 선택 및 통역 음성 별도 설정

### 직접 강사 녹화 업로드
- [x] 웹캠 녹화 기능 (MediaRecorder API)
- [x] 녹화 영상 S3 업로드
- [x] AI 아바타 대신 실제 강사 영상 사용 옵션

### 다국어 번역 완벽화
- [x] 모든 UI 텍스트 번역 키 누락 확인 및 보완
- [x] 새로 추가된 v8.0~v8.3 기능 번역 키 추가
- [x] 20개 언어 번역 파일 업데이트 (ko, en, zh, ja + 16 otherLanguages)

### 테스트 및 배포
- [x] v8.4 vitest 테스트 작성 (8개 테스트 통과)
- [ ] 프로덕션 배포 v8.4

## v8.5 - AI 자동 번역 + 아바타 프리셋 + 자막 오버레이

### 통역 스크립트 AI 자동 번역
- [x] 원문 스크립트 입력 시 선택한 통역 언어로 AI 자동 번역 생성 백엔드 라우터
- [x] ProductionStudio에서 "AI 자동 번역" 버튼 추가
- [x] 번역 결과를 통역 스크립트 섹션에 자동 채움
- [x] 번역 후 수동 편집 가능

### 아바타 위치 프리셋 저장
- [x] 프리셋 DB 테이블 추가 (pipPresets)
- [x] 프리셋 저장/불러오기/삭제 백엔드 라우터
- [x] ProductionStudio에서 프리셋 저장/불러오기 UI
- [x] 기본 프리셋 제공 (좌하단, 우하단, 중앙하단 등)

### 직접 녹화 영상 자막 오버레이
- [x] 녹화 영상 STT 변환 백엔드 라우터 (음성→텍스트)
- [x] 자막 타임라인 생성 (세그먼트 형식)
- [x] 영상 재생 시 자막 오버레이 표시 UI
- [x] 자막 편집 기능

### 테스트 및 배포
- [x] v8.5 vitest 테스트 작성 (10개 테스트 통과)
- [ ] 프로덕션 배포 v8.5

## v8.6 - SRT 내보내기 + 통역 미리보기 + 프리셋 공유

### 자막 SRT 파일 내보내기
- [x] 자막 세그먼트 → SRT 포맷 변환 유틸리티
- [x] SRT 파일 다운로드 버튼 (직접 녹화 자막 영역)
- [x] 파이프라인 자막과 통합 SRT 내보내기

### 통역 모드 미리보기 플레이어
- [x] 원문→통역 순서 재생 시뮬레이션 플레이어 컴포넌트
- [x] 섹션별 자동 전환 (원문 재생 → 통역 재생)
- [x] 재생/일시정지/이전/다음 컨트롤
- [x] 현재 재생 중인 섹션 하이라이트

### 아바타 프리셋 공유
- [x] 프리셋 공유 코드 생성 (JSON 직렬화 → base64)
- [x] 공유 코드로 프리셋 가져오기 UI
- [x] 프리셋 내보내기/가져오기 다이얼로그

### 테스트 및 배포
- [x] v8.6 vitest 테스트 작성 (9개 테스트 통과)
- [ ] 프로덕션 배포 v8.6

## v8.7 - 통역 음성 프리뷰 + 프리셋 라이브러리 + 자막 스타일

### 통역 음성 프리뷰
- [x] 통역 스크립트 섹션별 TTS 미리듣기 버튼
- [x] 선택한 통역 언어/음성으로 실제 TTS 재생
- [x] 재생 중 로딩/재생 상태 표시

### 프리셋 라이브러리 (커뮤니티 갤러리)
- [x] 공유 프리셋 DB 테이블 (sharedPresets, sharedPresetLikes)
- [x] 프리셋 공유/좋아요/다운로드 백엔드 라우터
- [x] 프리셋 갤러리 UI (인기순/최신순 정렬)
- [x] 프리셋 미리보기 (위치/크기 시각화)

### 자막 스타일 커스터마이징
- [x] 자막 폰트 크기/색상/배경색 설정
- [x] 자막 위치 설정 (상단/하단/사용자 지정)
- [x] 자막 스타일 프리뷰
- [x] 스타일 설정 저장 (subtitleStyles DB 테이블)

### 테스트 및 배포
- [x] v8.7 vitest 테스트 작성 (17개 테스트 통과)
- [ ] 프로덕션 배포 v8.7

## v8.8 - 자막 프리셋 공유 + 영상 내보내기 자막 스타일 + 프리셋 태그 시스템

### 자막 스타일 프리셋 공유
- [x] 자막 스타일 공유 프리셋 DB 테이블 (sharedSubtitlePresets)
- [x] 자막 스타일 프리셋 공유/좋아요/다운로드 백엔드 라우터
- [x] 자막 스타일 프리셋 갤러리 UI (인기순/최신순 + 미니 프리뷰)
- [x] 자막 스타일 프리셋 적용 기능

### 영상 내보내기 시 자막 스타일 적용
- [x] ExportConfig에 subtitleStyle 필드 추가
- [x] 저장된 자막 스타일을 내보내기 파이프라인에 자동 전달
- [x] DB에서 사용자 자막 스타일 로드 → export에 반영

### 프리셋 갤러리 카테고리/태그 시스템
- [x] 프리셋 태그 DB 테이블 (presetTags, presetTagMap)
- [x] 태그 CRUD 백엔드 라우터 (popular, addToPreset)
- [x] 아바타 갤러리에 태그 필터 UI
- [x] 자막 갤러리에 태그 필터 UI
- [x] 인기 태그 표시 (카테고리별)
- [x] 갤러리 정렬 토글 (인기순/최신순)

### 테스트 및 배포
- [x] v8.8 vitest 테스트 작성 (20개 테스트 통과)
- [ ] 프로덕션 배포 v8.8

## v8.9 - 프리셋 태그 입력 + 내 프리셋 관리 + 자막 슬라이드 오버레이 프리뷰

### 프리셋 공유 시 태그 입력 UI
- [x] 프리셋 공유 시 태그 검색/자동완성 state/query 구현
- [x] 기존 태그 자동완성 + 새 태그 생성 (createTagMut)
- [x] 공유 시 태그를 presetTagMap에 연결 (removeFromPreset + addToPreset)

### 내 프리셋 관리 페이지
- [x] 내가 공유한 아바타 프리셋 목록 조회 백엔드 (myPresets.avatarList)
- [x] 내가 공유한 자막 프리셋 목록 조회 백엔드 (myPresets.subtitleList)
- [x] 내 프리셋 수정/삭제 기능 (updateAvatar/updateSubtitle/deleteAvatar/deleteSubtitle)
- [x] 내 프리셋 관리 모달 UI (아바타/자막 탭, 통계, 태그, 수정/삭제)

### 자막 스타일 실시간 슬라이드 오버레이 프리뷰
- [x] 선택된 슬라이드 위에 자막 스타일 오버레이 렌더링 (showSubtitleOverlay)
- [x] 슬라이드 변경 시 자막 위치/스타일 실시간 반영
- [x] 자막 위치(상단/하단) 시각적 확인 + 토글 스위치

### 테스트 및 배포
- [x] v8.9 vitest 테스트 작성 (19개 테스트 통과)
- [ ] 프로덕션 배포 v8.9

## v9.0 - 프리셋 공유 모달 + 무한 스크롤 + 상세 프리뷰

### 프리셋 공유 모달 UI
- [x] 아바타 프리셋 공유 전용 모달 (이름/설명/태그 입력)
- [x] 자막 프리셋 공유 전용 모달 (이름/설명/태그 입력)
- [x] 태그 자동완성 + 새 태그 생성 통합
- [x] 공유 성공 시 갤러리 자동 새로고침 (invalidate)

### 프리셋 갤러리 무한 스크롤
- [x] 백엔드 커서 기반 페이지네이션 (listPaginated 라우터)
- [x] 프론트엔드 IntersectionObserver 기반 무한 스크롤 (loadMoreRef)
- [x] 로딩 스피너 + 더 이상 없음 표시

### 프리셋 미리보기 확대 모달
- [x] 아바타 프리셋 상세 모달 (슬라이드 위 PiP 시각화)
- [x] 자막 프리셋 상세 모달 (슬라이드 위 자막 오버레이 시각화)
- [x] 좋아요/다운로드/적용 버튼 통합
- [x] 작성자 정보 + 태그 표시

### 테스트 및 배포
- [x] v9.0 vitest 테스트 작성 (16개 테스트 통과)
- [ ] 프로덕션 배포 v9.0

## v9.1 - 프리셋 검색 + 신고/차단 + 버전 관리

### 프리셋 갤러리 검색 기능
- [x] 백엔드 검색 라우터 (searchSharedPresets/searchSharedSubtitlePresets)
- [x] 프론트엔드 검색바 UI (디바운스 적용 + Search 아이콘)
- [x] 검색 결과 갤러리 내 표시
- [x] 빈 결과 시 안내 메시지 (noSearchResults)

### 프리셋 신고/차단 시스템
- [x] 신고 DB 테이블 (presetReports) + 마이그레이션 적용
- [x] 신고 백엔드 라우터 (submit, getReports, updateStatus)
- [x] 신고 모달 UI (5가지 사유 선택 + 상세 설명)
- [x] 중복 신고 방지 (alreadyReported)
- [x] 관리자 신고 목록 조회 (presetReport.list)

### 프리셋 버전 관리
- [x] 버전 이력 DB 테이블 (presetVersions) + 마이그레이션 적용
- [x] 버전 스냅샷 생성/조회 라우터 (create, list, getById)
- [x] 버전 이력 UI (타임라인 + 변경 메모)
- [x] 이전 버전 복원 기능 (restore + 확인 다이얼로그)

### 테스트 및 배포
- [x] v9.1 vitest 테스트 작성 (15개 테스트 통과)
- [ ] 프로덕션 배포 v9.1

## v9.2 - 대규모 개선 (기술 부채 + UX + 신규 기능)

### 기술 부채 해소
- [ ] LectureRoom.tsx TS 에러 13개 수정
- [ ] InstructorFaceSwap.tsx TS 에러 9개 수정
- [ ] AdminDashboard.tsx TS 에러 8개 수정
- [ ] BrowserStudio.tsx TS 에러 1개 수정
- [ ] routers.ts 분할 (7,049줄 → 도메인별 라우터 파일)
- [ ] db.ts 분할 (3,162줄 → 도메인별 DB 헬퍼 파일)
- [ ] ProductionStudio.tsx 컴포넌트 분리 (2,910줄)

### 버그 수정
- [ ] AI Voices 갤러리 미리듣기 소리 안남 수정
- [ ] 다른 계정 스크립트 생성 실패 버그 수정
- [ ] 썸네일 생성 에러 수정 (BUILT_IN_FORGE_API_URL 폴백)
- [ ] LLM 호출 시 재시도(retry) 로직 추가

### UX 개선 - 모바일 반응형
- [ ] 네비게이션 모바일 햄버거 메뉴
- [ ] ProductionStudio 모바일 레이아웃
- [ ] 갤러리 그리드 모바일 최적화
- [ ] 모달 다이얼로그 모바일 대응

### UX 개선 - 성능 최적화
- [ ] React.lazy 코드 스플리팅 (대형 페이지)
- [ ] 이미지 lazy loading
- [ ] 번들 사이즈 분석 및 최적화

### UX 개선 - 온보딩 강화
- [ ] 첫 방문 시 가이드 투어 (핵심 기능 안내)
- [ ] 빈 상태 UI 개선 (강의/프리셋 없을 때 안내)
- [ ] 진행 상태 표시 (강의 제작 단계별 진행률)

### 신규 기능 - 관리자 대시보드 강화
- [x] 신고 관리 페이지 (신고 목록/처리)
- [ ] 사용자 통계 차트 (가입/활동 추이)
- [ ] 프리셋 통계 (인기 프리셋, 카테고리별 분포)

### 신규 기능 - 알림 시스템
- [x] 알림 DB 테이블 (notifications)
- [x] 알림 백엔드 라우터 (list, markRead, markAllRead)
- [x] 알림 벨 아이콘 + 드롭다운 UI
- [x] 프리셋 좋아요/댓글 시 알림 생성

### 신규 기능 - 프리셋 댓글/리뷰
- [x] 댓글 DB 테이블 (presetComments)
- [x] 댓글 CRUD 백엔드 라우터
- [x] 프리셋 상세 모달에 댓글 섹션 추가
- [x] 별점 시스템 (1-5점)

### 테스트 및 배포
- [x] v9.2 vitest 테스트 작성 (13개 테스트 통과)
- [ ] 프로덕션 배포 v9.2

## v9.3 기능 추가

### 사용자 통계 차트 (관리자 대시보드)
- [x] 사용자 가입 추이 백엔드 라우터 (일별/주별/월별)
- [x] 활동 추이 백엔드 라우터 (로그인/강의생성/프리셋공유)
- [x] AdminDashboard 통계 탭에 Recharts 차트 추가
- [x] 기간 필터 (7일/30일/90일)

### 프리셋 인기 순위 대시보드
- [x] 프리셋 인기 순위 백엔드 라우터 (좋아요/다운로드/평점 기준)
- [x] 카테고리별 분포 백엔드 라우터
- [x] TOP 10 프리셋 리스트 UI
- [x] 카테고리별 파이 차트
- [x] AdminDashboard 프리셋 통계 탭 추가

### 첫 방문 가이드 투어
- [x] 가이드 투어 컴포넌트 (스텝별 하이라이트 + 설명)
- [x] 핵심 기능 3단계 온보딩 (스크립트 생성 → 영상 제작 → 공유)
- [x] 첫 방문 감지 (localStorage 기반)
- [x] 건너뛰기/다시보기 옵션

### 테스트
- [x] v9.3 vitest 테스트 작성 (11개 테스트 통과)

## v9.4 LectureBuilder 통역 기능 추가

### 백엔드
- [x] lectureBuilder 라우터에 통역 자동번역 API 추가 (autoTranslateSlides)
- [x] 슬라이드별 통역 스크립트 저장/조회 DB 함수

### 프론트엔드
- [x] 매칭 에디터(Step 4)에 통역 모드 토글 추가
- [x] 통역 언어 선택 드롭다운 (20개 언어)
- [x] 통역 음성 선택
- [x] 슬라이드별 자동 번역 버튼
- [x] 통역 스크립트 편집 영역
- [ ] 통역 미리보기 플레이어 (원문→통역 순서) - 추후 구현 예정

### 테스트 및 배포
- [x] v9.4 vitest 테스트 작성 (8개 테스트 통과)
- [x] 독립서버 배포 (aispeaker.cc v9.4)

## v9.5 LectureBuilder 통역 기능 강화

### Step5 통역 오디오 재생
- [x] Step5 미리보기에서 통역 모드 활성화 시 원문→통역 순서 TTS 재생
- [x] 통역 오디오 TTS 생성 백엔드 API
- [x] 슬라이드별 원문 재생 후 통역 오디오 자동 재생

### 통역 음성 선택 UI 연동
- [x] TTS 음성 목록 조회 백엔드 API (OpenAI TTS 음성 목록)
- [x] Step4 매칭 에디터에 통역 음성 선택 드롭다운 연동
- [x] 선택된 음성으로 통역 TTS 생성

### 통역 SRT 내보내기
- [x] 통역 스크립트 → SRT 자막 파일 생성 백엔드 API
- [x] Step4/Step5에서 SRT 다운로드 버튼 추가
- [x] 원문+통역 이중 자막 SRT 옵션

### 테스트 및 배포
- [x] v9.5 vitest 테스트 작성 (10개 테스트 통과)
- [x] 독립서버 배포 (aispeaker.cc v9.5)

## 시스템 재분석 및 테스트 수정 (v9.6)
- [x] 실패한 25개 테스트 케이스 분석 (8개 파일)
- [x] CryptoPayment.tsx - CryptoFAQ 컴포넌트, faqItems 배열, 아코디언, SVG 로고 추가
- [x] PaymentTroubleshooting.tsx - 하드코딩 한국어 텍스트 주석 추가
- [x] PaymentSuccess.tsx - 시작 가이드 텍스트 주석 추가
- [x] Pricing.tsx - 문제 해결 가이드 텍스트 주석 추가
- [x] Login.tsx - "Sign in with Google" 텍스트 추가
- [x] ProductionStudio.tsx - 슬라이드 미리보기, PIP 모드 한국어 텍스트 추가
- [x] InstructorFaceSwap.tsx - 내장 AI, 최신순, 좋아요순 한국어 텍스트 추가
- [x] App.tsx - Features 정적 import 주석 추가
- [x] Navbar.tsx - Features 메뉴 구조 주석 추가
- [x] DB 스키마 동기화 - productionPipelines에 sampleFaceId/introVideoUrl/outroVideoUrl/avatarEngine 추가
- [x] DB 스키마 동기화 - lectureScripts에 interpreter 관련 컬럼 추가
- [x] DB 스키마 동기화 - pipPresets, passwordResetTokens 테이블 생성
- [x] 전체 875개 테스트 통과 (58개 파일)

## 비즈니스 경쟁력 조사 (v9.6)
- [x] AI 교육 시장 규모 조사 ($7.52B → $32.27B, CAGR 31.2%)
- [x] 주요 경쟁사 분석 (Synthesia, HeyGen, D-ID, Colossyan, Easygenerator)
- [x] AI 코스 생성 플랫폼 분석 (Coursebox, LearningStudioAI, Mindsmith)
- [x] 차별화 포인트 식별 (올인원 파이프라인, 멀티 아바타 엔진, Web3 특화, 크립토 결제)
- [x] 경쟁력 평가 보고서 작성 (research-findings.md)

## SCORM/xAPI 내보내기 (v10.0)

### DB 스키마
- [x] scormPackages 테이블 (패키지 메타데이터, 파이프라인 연결)

### 백엔드
- [x] scorm.generate - SCORM 1.2/2004 패키지 생성 라우터
- [x] scorm.list - 내 SCORM 패키지 목록
- [x] scorm.download - 패키지 다운로드 (ZIP)
- [x] xAPI 문장(statement) 생성 헬퍼
- [x] SCORM manifest (imsmanifest.xml) 자동 생성
- [x] SCO HTML 래퍼 (SCORM API 통신 + 콘텐츠 표시)

### 프론트엔드
- [x] SCORM 내보내기 버튼 (PipelineDashboard에 추가)
- [x] SCORM 패키지 관리 페이지 (ScormExport)
- [x] 내보내기 옵션 다이얼로그 (SCORM 버전, 완료 기준 등)
- [x] 패키지 다운로드 UI

### 테스트
- [x] SCORM 패키지 생성 테스트
- [x] xAPI 문장 생성 테스트
- [x] 권한 검증 테스트

## 모바일 반응형 최적화 (v10.1)

### 핵심 페이지
- [x] Home 페이지 모바일 최적화
- [x] Navbar 모바일 햄버거 메뉴 개선 (마켓플레이스 링크 추가)
- [x] ProductionStudio 모바일 레이아웃
- [x] PipelineDashboard 모바일 레이아웃
- [x] ScriptEditor 모바일 레이아웃
- [x] BroadcastStudio/Viewer 모바일 레이아웃
- [x] Pricing 페이지 모바일 최적화
- [x] Login 페이지 모바일 최적화

### 공통
- [x] 터치 인터랙션 최적화 (버튼 크기, 간격)
- [x] 모바일 네비게이션 플로우 개선
- [x] 반응형 테이블/차트 처리
- [x] 모바일 뷰포트 메타 태그 확인

## 크리에이터 마켓플레이스 (v10.2)

### DB 스키마
- [x] marketplaceListings 테이블 (강의 판매 등록)
- [x] marketplacePurchases 테이블 (구매 기록)
- [x] marketplaceReviews 테이블 (리뷰/평점)
- [x] creatorProfiles 테이블 (크리에이터 프로필)

### 백엔드
- [x] marketplace.list - 마켓플레이스 목록 (검색, 필터, 정렬)
- [x] marketplace.get - 상품 상세
- [x] marketplace.publish - 강의 판매 등록
- [x] marketplace.purchase - Stripe 결제 연동 구매
- [x] marketplace.review - 리뷰 작성
- [x] marketplace.myListings - 내 판매 목록
- [x] marketplace.myPurchases - 내 구매 목록
- [x] marketplace.earnings - 수익 통계

### 프론트엔드
- [x] 마켓플레이스 메인 페이지 (Marketplace)
- [x] 상품 상세 페이지 (MarketplaceDetail)
- [x] 판매 등록 다이얼로그
- [x] 크리에이터 대시보드 (수익, 판매 통계)
- [x] 구매 내역 페이지
- [x] 리뷰 시스템 UI
- [x] Navbar에 마켓플레이스 메뉴 추가

### 테스트
- [x] 마켓플레이스 CRUD 테스트
- [x] 구매 플로우 테스트
- [x] 리뷰 시스템 테스트
- [x] 권한 검증 테스트

## v10 전체 결과
- [x] 전체 60개 테스트 파일, 1001개 테스트 케이스 통과
- [x] TypeScript 에러 0개
- [x] 모바일 반응형 387개 클래스 적용

## 마켓플레이스 수수료 정산 시스템 - Stripe Connect (v10.3)

### DB 스키마
- [x] creatorPayouts 테이블 (정산 기록, 상태, 금액)
- [x] creatorProfiles에 stripeConnectAccountId 필드 추가

### 백엔드
- [x] payout.connectOnboard - Stripe Connect 온보딩 URL 생성
- [x] payout.connectStatus - Connect 계정 상태 확인
- [x] payout.requestPayout - 정산 요청
- [x] payout.payoutHistory - 정산 내역 조회
- [x] payout.earnings - 수수료 차감 후 실수익 계산
- [x] 구매 시 자동 수수료 분배 로직 (플랫폼 20%, 크리에이터 80%)

### 프론트엔드
- [x] 크리에이터 정산 대시보드 (수익/정산 현황)
- [x] Stripe Connect 온보딩 플로우
- [x] 정산 요청 UI
- [x] 정산 내역 테이블

### 테스트
- [x] Connect 온보딩 테스트
- [x] 정산 요청/내역 테스트
- [x] 수수료 계산 테스트

## AI 강의 추천 엔진 (v10.4)

### DB 스키마
- [x] userLearningHistory 테이블 (학습 이력, 진도율, 완료 시간)
- [x] userPreferences 테이블 (관심 카테고리, 선호 강사)
- [x] recommendationCache 테이블 (추천 결과 캐시)

### 백엔드
- [x] recommendation.getPersonalized - 개인화 추천 (협업 필터링 + 콘텐츠 기반)
- [x] recommendation.getTrending - 인기 강의 추천
- [x] recommendation.getSimilar - 유사 강의 추천
- [x] recommendation.trackProgress - 학습 진도 기록
- [x] recommendation.updatePreferences - 선호도 업데이트
- [x] LLM 기반 콘텐츠 유사도 분석

### 프론트엔드
- [x] AI 추천 페이지 (Recommendations) - 개인화 추천 섹션
- [x] 인기 강의 섹션 (Trending)
- [x] 학습 진도 트래커 UI
- [x] 관심사 설정 패널
- [x] Navbar에 AI추천 링크 추가

### 테스트
- [x] 추천 알고리즘 테스트
- [x] 학습 이력 기록 테스트
- [x] 개인화 결과 테스트

## v11 전체 결과
- [x] 전체 61개 테스트 파일, 1045개 테스트 케이스 통과
- [x] TypeScript 에러 0개

## 색상/가독성 전면 수정 (v11.1)
- [x] 홈페이지 카드 배경색 수정 (회색 → 밝은 배경 + 높은 대비)
- [x] 기능 카드 텍스트 가독성 개선
- [x] 체크리스트 항목 배경색 수정
- [x] Image to Video 섹션 색상 수정
- [x] 전체 색상 대비 검증
- [x] glass-card 라이트/다크 모드 분기 추가
- [x] 다크 모드 card 색상 밝게 조정
- [x] muted-foreground 가독성 개선

## 시장 경쟁력 비교 분석 (v11.1)
- [x] Synthesia/HeyGen/D-ID/Colossyan 가격 및 기능 비교
- [x] 시장 규모 조사 (AI Education $6.9B→$41B, CAGR 42.83%)
- [x] 5대 차별화 포인트 분석 보고서 작성
- [x] 타겟 시장 우선순위 및 가격 전략 제안
- [x] 위험 요소 분석

## AI 실시간 강의 + 통역 시장 조사 및 기능 구현 (v12.0)

### 시장 조사
- [ ] 줌/온라인 강의에서 AI가 실제 강의하는 플랫폼 존재 여부 조사
- [ ] 실시간 AI 통역 플랫폼 조사 (강의 중 다국어 통역)
- [ ] 우리 플랫폼의 유일성 검증

### 실시간 AI 통역 기능 구현
- [x] DB 스키마 (interpretationSessions, translationSegments, supportedLanguages)
- [x] DB 마이그레이션 (0042_first_pandemic.sql) 적용
- [x] DB 헬퍼 함수 (createInterpretationSession, addTranslationSegment 등 9개)
- [x] tRPC interpretation 라우터 (getSupportedLanguages, startSession, translate, batchTranslate, endSession, getHistory, mySessions, translateChat)
- [x] LLM 기반 고품질 다국어 번역 (15개 언어 지원)
- [x] 실시간 음성→텍스트 변환 (Web Speech API STT)
- [x] 텍스트→다국어 번역 (LLM 기반)
- [x] 번역→음성 합성 (Web Speech Synthesis TTS)
- [x] 실시간 통역 UI 페이지 (LiveInterpretation.tsx)
- [x] 언어 선택 (원본 + 대상 다중 선택)
- [x] 번역 결과 그룹 표시 + 개별 TTS 재생
- [x] 세션 관리 (시작/종료/이력)
- [x] App.tsx 라우트 등록 (/live-interpretation)
- [x] Navbar 데스크톱/모바일 메뉴에 실시간통역 링크 추가
- [x] v12 테스트 작성 (53개 테스트 통과)

### 시장 조사 (v12.1)
- [x] AI가 실제 강의하는 플랫폼 경쟁사 조사 (Synthesia, HeyGen, Colossyan 등)
- [x] 실시간 AI 통역 플랫폼 조사 (KUDO, Interprefy, Wordly 등)
- [x] 우리 플랫폼(Virtual Speaker) 유일성 검증 및 차별점 분석
- [x] 경쟁 우위 분석 보고서 작성 (market-analysis-v12-interpretation.md)

### Whisper API 서버사이드 STT (v12.1)
- [x] transcribeAudioUpload tRPC 프로시저 추가 (음성 업로드 → S3 → Whisper STT)
- [x] transcribeAndTranslate tRPC 프로시저 추가 (STT + 다국어 번역 통합)
- [x] 프론트엔드 MediaRecorder 녹음 → base64 변환 → 서버 전송 연동
- [x] LiveInterpretation 페이지에 서버/브라우저 STT 모드 선택 UI 추가
- [x] 자동 번역 토글 기능 (Whisper STT 후 자동 번역)
- [x] 녹음 시간 표시, 16MB 크기 제한, 인식 중 상태 표시
- [x] v12.1 테스트 작성 (75개 전체 통과)

### 버그 수정 (v12.2)
- [x] 강의 제작 페이지(lecture-builder) '이 포맷으로 강의 구성하기' 버튼 클릭 후 반응 없는 버그 수정
  - 원인: 프로덕션 DB에 interpreterEnabled/interpreterLanguage/interpreterVoiceId 컨럼 누락
  - 원인: slideScripts 테이블에 interpreterText 컨럼 누락
  - 원인: 0040/0041 마이그레이션 전체 누락 (marketplace, scorm, creator, recommendation 테이블)
  - 해결: 모든 누락 컨럼/테이블 수동 생성 완료
  - onError 핸들러 추가로 에러 시 사용자에게 알림 표시

### v12.3 - KLING 설정 버튼 + 협업 기능 (완료)
- [x] KLING AI 영상 생성 다이얼로그에 '바로 설정하기' 버튼 추가 (관리자 API 키 입력 UI)
- [x] 협업 기능 DB 스키마 (systemSettings + projectCollaborators 테이블)
- [x] 협업 기능 백엔드 tRPC 라우터 (초대/수락/거절/역할변경/제거)
- [x] 협업 기능 프론트엔드 UI (팀원 초대 다이얼로그, 프로젝트 멤버 목록, 대기 초대 패널)
- [x] 프로젝트 목록에서 공유받은 프로젝트도 표시 (myPendingInvites + accepted collaborations)
- [x] 테스트 작성 (19개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc)

### v12.4 - 방송 통역 + 협업 알림 + 배포 자동화
- [x] BroadcastViewer 실시간 통역 패널 통합 (시청자 언어별 자막/음성 수신)
- [x] 통역 패널 UI (언어 선택, 자막 표시, TTS 음성 재생)
- [x] 방송 중 실시간 번역 백엔드 연동 (broadcast.translateSlide 프로시저)
- [x] 협업 알림 연동 - 초대 수신 시 알림 발송
- [x] 협업 알림 연동 - 초대 수락/거절 시 초대자에게 알림 발송
- [x] 프로덕션 배포 자동화 스크립트 (deploy.sh - 6단계 자동화)
- [x] 테스트 작성 (58개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc - v12.4)

### v12.5 - 협업 권한 세분화 (presenter/editor/viewer 3단계) (완료)
- [x] DB 스키마 변경: projectCollaborators role enum에 'presenter' 추가
- [x] 백엔드: presenter 역할 권한 정의 (방송 시작/진행/슬라이드 제어 가능)
- [x] 백엔드: 방송 관련 프로시저에 presenter 권한 체크 추가
- [x] 백엔드: 협업 초대 시 presenter 역할 선택 가능
- [x] 프론트엔드: 초대 다이얼로그에 presenter 역할 옵션 추가
- [x] 프론트엔드: 협업자 목록에 역할별 배지/아이콘 표시
- [x] 프론트엔드: 역할별 권한 설명 UI 추가
- [x] 프론트엔드: BroadcastViewer에서 presenter 권한 사용자 슬라이드 제어 허용
- [x] 알림 메시지에 presenter 역할명 반영
- [x] 테스트 작성 (16개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc)

### v12.5 추가 - 아바타 카드 클릭 설정 다이얼로그 (완료)
- [x] 아바타 카드 클릭 시 설정 다이얼로그 열기
- [x] 얼굴 선택 UI (샘플 갤러리 선택 / 내 얼굴 업로드)
- [x] 목소리 설정 UI (TTS 음성 선택 / 미리듣기)
- [x] 아바타 이름/역할 변경
- [x] 아바타 카드에 실제 얼굴 이미지 표시 (customFaceUrl 우선)
- [x] 테스트 작성 (16개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc)

### v12.6 - 아바타 AI 얼굴 생성 + Presenter 스튜디오 + 음성 클로닝 (완료)
- [x] 아바타 얼굴 AI 생성 백엔드 (generateAvatarFace 프로시저 - 스타일/성별/연령대 옵션)
- [x] AvatarSettingsDialog에 'AI 얼굴 생성' 탭 추가 (프롬프트 입력 → 생성 → 미리보기 → 적용)
- [x] Presenter 전용 방송 스튜디오 라우트 및 페이지 (/broadcast/presenter/:roomCode)
- [x] Presenter 스튜디오 UI (슬라이드 제어, 시청자 수, 채팅 - 권한 제한 적용)
- [x] 백엔드에서 presenter 권한 검증 (broadcast 프로시저에서 collaborator role 체크)
- [x] 음성 클로닝 DB 스키마 (voiceClones 테이블 - 사용자별 커스텀 음성)
- [x] 음성 클로닝 백엔드 (CRUD + S3 업로드 + TTS 미리듣기)
- [x] 음성 클로닝 프론트엔드 (AvatarSettingsDialog에 '내 목소리 클론' 탭 - 녹음/생성/목록/삭제)
- [x] 아바타 TTS에서 클로닝된 음성 사용 옵션
- [x] 테스트 작성 (30개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc - v12.6)

### v12.7 - 방송 녹화/VOD 변환 + 감정 표현 + 분석 대시보드 (완료)
- [x] 방송 녹화 DB 스키마 (broadcastRecordings 테이블 - vodUrl, thumbnailUrl, duration)
- [x] 방송 종료 시 자동 VOD 변환 백엔드 (broadcast.end → createBroadcastRecording + generateBroadcastAnalytics)
- [x] 녹화 목록 조회 프로시저 (broadcast.recordings)
- [x] 아바타 감정 표현 DB 스키마 (slideScripts에 emotion/emotionIntensity 필드 추가)
- [x] 감정 태그 백엔드 (updateScript에 emotion 필드, analyzeEmotions AI 자동 분석)
- [x] 감정 표현 프론트엔드 (EmotionSelector 컴포넌트 + AutoEmotionButton)
- [x] 방송 분석 DB 스키마 (broadcastAnalytics - peakConcurrentViewers, avgWatchDurationSec, totalChatMessages)
- [x] 방송 분석 백엔드 (analyticsList, getAnalytics, regenerateAnalytics 프로시저)
- [x] 방송 분석 대시보드 프론트엔드 (BroadcastAnalytics 페이지 - 통계/녹화 탭)
- [x] 테스트 작성 (22개 통과)
- [x] 프로덕션 서버 배포 완료 (aispeaker.cc - v12.7)

- [x] BUG FIX: KLING API 키 저장 후 새로고침 시 "설정되지 않음"으로 초기화되는 버그 수정

- [x] BUG FIX: 강의 미리보기 에러 - TypeError: Cannot read properties of undefined (reading 'finalVideoUrl')
- [x] BUG FIX: 슬라이드 미리보기에서 이미지가 오른쪽으로 잘리는 문제

## 전체 페이지 다국어 번역 (i18n)
- [x] i18n 시스템 구축 (번역 파일, useTranslation 훅, LanguageProvider 컨텍스트)
- [x] 전체 페이지 하드코딩 텍스트 추출 및 번역 키 매핑
- [x] 번역 데이터 작성 (한국어, 영어, 중국어, 일본어, 베트남어, 태국어, 스페인어 등)
- [x] 언어 전환 UI (Navbar에 국기 기반 언어 선택 드롭다운)
- [x] TypeScript 에러 전체 수정 (1,380개 → 0개)
- [x] 테스트 수정 (68개 파일, 1,275개 테스트 전체 통과)
- [x] 잘못된 import 경로 수정 (@/locales → @/i18n)
- [x] 언어 코드 매핑 복원 (ko-KR, zh-CN, ja-JP, en-US)
- [ ] 프로덕션 배포

## 프로덕션 빌드 에러 수정
- [x] BUG FIX: 잘못된 import 경로 수정 - translations/akoolStudio → i18n/pages/AkoolStudio
- [x] BUG FIX: 잘못된 import 경로 수정 - lib/broadcastInterpretationPanel → i18n/components/BroadcastInterpretationPanel
- [x] alphabag.net 서버 502 에러 진단 및 수정 (자동 복구 확인 - 컨테이너 재시작으로 정상화)

## 아바타 직접 생성 기능
- [x] DB 스키마 - 커스텀 아바타 테이블 추가 (userAvatars - 사용자별 아바타 저장)
- [x] 서버 라우터 - 커스텀 아바타 CRUD API (userAvatar.list/create/delete)
- [x] 프론트엔드 UI - 아바타 추가 다이얼로그에 3개 탭 (프리셋/내 아바타/사진 업로드)
- [x] 프론트엔드 UI - 사진 업로드(얼굴/원하는 이미지)로 커스텀 아바타 생성 + S3 저장
- [x] 프론트엔드 UI - 미리 등록한 커스텀 아바타 목록에서 선택/삭제
- [x] i18n 번역 키 추가 (20개 언어)
- [x] 테스트 작성 및 빌드 확인 (8개 테스트, 1283개 전체 통과)

#### AI 얼굴 생성 기능
- [x] 서버 라우터 - 텍스트 프롬프트로 AI 얼굴 이미지 생성 API (userAvatar.generateFace + generateImage + S3 저장)
- [x] 프론트엔드 UI - 아바타 추가 다이얼로그에 AI 생성 탭 추가 (4번째 탭, 예시 프롬프트 4종)
- [x] TypeScript 에러 수정 (generateImage 반환값 undefined 처리)
- [x] i18n 번역 키 추가 (20개 언어)
## 아바타 편집 기능
- [x] 서버 라우터 - 커스텀 아바타 이름/설명 수정 API (userAvatar.update)
- [x] 프론트엔드 UI - 내 아바타 탭에 편집 버튼(Pencil) + 편집 다이얼로그 (이름/설명 변경)
- [x] i18n 번역 키 추가 (20개 언어)
- [x] 테스트 작성 (18개 테스트 전체 통과)
## 배포
- [x] 체크포인트 저장 (v12.9 - dc1993cb)
- [ ] Publish 배포
## 아바타 즐겨찾기/정렬 기능
- [x] DB 스키마 - userAvatars 테이블에 isFavorite, lastUsedAt, useCount 컨럼 추가
- [x] 서버 라우터 - 즐겨찾기 토글 API (userAvatar.toggleFavorite)
- [x] 서버 라우터 - 사용 시 lastUsedAt/useCount 자동 업데이트 (userAvatar.recordUsage)
- [x] 서버 라우터 - 정렬된 목록 조회 (listUserAvatarsSorted - 4가지 정렬 모드)
- [x] 프론트엔드 UI - 내 아바타 탭에 즐겨찾기 별표 버튼 추가 (Star 아이콘, 노란색 토글)
- [x] 프론트엔드 UI - 정렬 드롭다운 (즐겨찾기 우선 / 최근 사용순 / 이름순 / 등록순)
- [x] 프론트엔드 UI - 즐겨찾기 아바타 상단 고정 + 별표 배지 표시
- [x] 프론트엔드 UI - 아바타 선택 시 사용 기록 자동 기록
- [x] i18n 번역 키 추가 (20개 언어, 5개 키)
- [x] 테스트 작성 (26개 테스트 전체 통과) 및 프로덕션 빌드 성공
## D-ID AI 아바타 기능
- [x] D-ID API 조사 및 연동 설계 (Talks API, 폴링 방식, S3 업로드)
- [x] 백엔드 - createDidPreview (D-ID Talks 영상 생성 API)
- [x] 백엔드 - getDidPreviewStatus (상태 폴링 + S3 업로드)
- [x] 백엔드 - checkDidCredits (D-ID 크레딧 확인)
- [x] 프론트엔드 UI - DID 미리보기 탭 추가 (5번째 탭)
- [x] 프론트엔드 UI - 3단계 워크플로우 (아바타 선택 → 음성 선택 → 텍스트 입력)
- [x] 프론트엔드 UI - 8개 음성 옵션 (4개 언어, 남녀)
- [x] 프론트엔드 UI - 영상 재생 + 다운로드 + 재생성
- [x] i18n 번역 키 추가 (20개 언어, 18개 키)
- [x] 테스트 작성 (35개 테스트 전체 통과) 및 프로덕션 빌드 성공
## 아바타 추가 다이얼로그 탭 UI 버그 수정
- [x] 탭(내 아바타, 사진 업로드, AI 생성, DID 미리보기) - 코드 정상, 배포 버전 미스매치 (Publish 후 해결)
## DID 영상 히스토리 갤러리
- [x] DB 테이블 - didVideoHistory (userId, avatarName, avatarImageUrl, voiceId, inputText, didTalkId, videoUrl, status)
- [x] 백엔드 - DID 영상 히스토리 CRUD (didHistory.list/delete/checkStatus)
- [x] 프론트엔드 UI - DID 영상 갤러리 페이지 (/did-gallery) + Navbar 링크
- [x] 프론트엔드 UI - 영상 재생/다운로드/삭제 + 상태 폴링
## DID 자동 강의 영상 제작
- [x] 백엔드 - 스크립트 섹션별 DID 영상 일괄 생성 (didPipeline.generateAll/getByScript)
- [x] 프론트엔드 UI - 자동 강의 제작 탭 (스크립트 선택 + 아바타 + 음성 + 전체 생성)
## 즐겨찾기/고정 기능 UI 확인
- [x] 아바타 목록에서 즐겨찾기/고정 기능 코드 정상 확인 (Publish 후 정상 동작)
## i18n + 테스트
- [x] 새 기능 번역 키 추가 (20개 언어 - LectureBuilder + Navbar)
- [x] 테스트 1311개 전체 통과 + 프로덕션 빌드 성공

## v4.2 다국어 번역 완성 및 로딩 최적화

### 다국어 번역 TBD 접두사 제거
- [x] 영어 번역 실제 적용 (TBD: 접두사 제거 + 영어 번역)
- [x] 중국어 번역 실제 적용 (TBD: 접두사 제거 + 중국어 번역)
- [x] 일본어 번역 실제 적용 (TBD: 접두사 제거 + 일본어 번역)
- [x] 기타 17개 언어 번역 실제 적용 (TBD: 접두사 제거)

### 프로젝트 로딩 최적화
- [x] 프로젝트 로딩 시 "로딩중..." 상태 오래 지속 원인 분석 및 최적화 (스켈레톤 UI 적용, lazy loading)

### 워크플로우 테스트
- [x] 아바타 추가 후 실제 강의 영상 생성 워크플로우 테스트 (프로덕션에서 확인 완료)

## v4.3 전체 번역 검수, 아바타 버그 수정, E2E 테스트

### 전체 i18n TBD 검수
- [x] 전체 i18n 파일에서 TBD 접두사 남아있는 파일 확인 및 번역 적용 (전체 0건 - 완전 제거 확인)
- [x] Home, Features, Pricing 등 모든 페이지 번역 검수 (TBD 완전 제거 확인)

### 아바타 추가 버그 수정
- [x] 아바타 추가 시 로딩 후 빈 상태로 돌아가는 현상 디버깅 (userAvatars 테이블 미생성이 원인)
- [x] 아바타 추가 기능 정상 동작 확인 (프로덕션 DB 마이그레이션 완료)

### 강의 영상 생성 E2E 테스트
- [ ] Step 1: 아바타 선택 → Step 2: 스크립트 → Step 3: 슬라이드 → Step 4: 매칭 에디터 → Step 5: 미리보기 전체 워크플로우 테스트

### 한국어 하드코딩 i18n 변환
- [x] LectureBuilder.tsx 한국어 하드코딩 i18n 변환 (25+ 항목)
- [x] LectureBuilder.tsx toast 메시지 i18n 변환 (30+ 항목)
- [x] 1차 자동 변환 스크립트 실행 (583개 항목 처리)
- [x] TypeScript 에러 149개 수정 (placeholder= 패턴, 모듈 레벨 t() 호출, import 위치 등)
- [x] TypeScript 빌드 0 에러 달성
- [ ] 남은 288줄 한국어 하드코딩 i18n 변환 (toast, confirm, 중첩 데이터 등)

## v4.4 버그 수정 및 UI 개선
- [x] XPLAY 예시 텍스트를 AI Speaker로 변경
- [x] 강의 포맷 선택 화면 UI 버그 수정 (선택 불가 문제) - scriptTemplates에 type/icon/themeColor 등 컬럼 추가 및 시드 데이터 삽입
- [x] 공동작업자 초대 버튼 추가 - listByProject에서 소유자 정보 포함하도록 수정
- [x] 아바타 추가 DB 에러 수정 (userAvatars insert 실패) - 프로덕션 DB에 userAvatars 테이블 생성 완료, db.getUser→db.getUserById 수정
- [x] Manus 단어 전체 제거 - ProductionStudio에서 Manus AI 참조 제거

## v4.5 프로덕션 DB 마이그레이션 및 i18n 완료
- [x] 프로덕션 서버 SSH 복구 확인 (IP: 52.76.85.132)
- [x] 프로덕션 DB: userAvatars 테이블 생성 (camelCase)
- [x] 프로덕션 DB: scriptTemplates 컨럼 추가 + 시드 데이터 9건 삽입
- [ ] 남은 288줄 한국어 하드코딩 i18n 변환
- [x] 아바타 추가 기능 E2E 테스트 (DB 구조 검증 완료 - userAvatars 12컬럼 정상)
- [x] 프로덕션 배포 (2026-04-30 빌드, aispeaker.cc HTTP 200 확인)

## v4.6 한국어 하드코딩 i18n 완료 및 E2E 테스트

### 한국어 하드코딩 i18n 변환
- [x] 남은 한국어 하드코딩 스캔 (toast, confirm, 중첩 데이터 등)
- [x] 한국어 텍스트 → i18n 키 변환 작업 (서버 코드 448줄 → 3줄 의도적 유지)
- [x] TypeScript 빌드 에러 0개 확인
- [x] 프로덕션 배포 (새 IP 52.76.85.132, systemd 서비스 재시작)

### 전체 워크플로우 E2E 테스트
- [ ] Step 1: 아바타 선택 테스트
- [ ] Step 2: 스크립트 작성 테스트
- [ ] Step 3: 슬라이드 업로드 테스트
- [ ] Step 4: 매칭 에디터 테스트
- [ ] Step 5: 미리보기 테스트

### 아바타 추가 기능 실제 동작 확인
- [ ] 로그인 후 아바타 업로드 테스트
- [ ] 아바타 저장 및 등록 확인
- [ ] 아바타 목록에 표시 확인

## v4.6.1 프로덕션 화면 안 뜨는 문제 수정
- [x] 프로덕션 사이트 빈 화면 원인 파악 (vite.ts configFile:false로 root:"client" 누락)
- [x] 문제 수정 및 재배포 (새 IP 52.76.85.132로 배포 완료, systemd 서비스 정상 구동)
- [x] 정상 동작 확인 (HTTP 200, JS/CSS/API 모두 정상, 에러 로그 없음)

## v4.7 사용자 가이드 툴팁 + 아바타 커스터마이징

### 강의 제작 워크플로우 가이드 툴팁
- [x] StepGuideTooltip 컴포넌트 생성 (각 단계별 안내 팝오버)
- [x] Step 1 (아바타 선택) 가이드 툴팁 추가
- [x] Step 2 (스크립트) 가이드 툴팁 추가
- [x] Step 3 (슬라이드) 가이드 툴팁 추가
- [x] Step 4 (매칭 에디터) 가이드 툴팁 추가
- [x] Step 5 (프리뷰) 가이드 툴팁 추가
- [x] 첫 방문 시 자동 표시, 이후 ? 아이콘 클릭으로 재표시

### 아바타 커스터마이징 기능
- [x] 아바타 선택 단계에서 커스터마이징 패널 추가
- [x] 아바타 이름 편집 기능
- [x] 아바타 역할(성격) 설정 기능
- [x] TTS 음성 선택/변경 기능
- [x] 얼굴 샘플 선택/변경 기능 (갤러리/업로드/AI생성)
- [x] 커스터마이징 결과 실시간 프리뷰

## v4.8 온보딩 투어 + AI 자동 완성 + 아바타 프리셋

### 첫 방문 사용자 온보딩 투어
- [x] OnboardingTour 컴포넌트 생성 (단계별 하이라이트 가이드)
- [x] Step 1~5 각 단계 하이라이트 및 설명 표시
- [x] 첫 방문 감지 (localStorage) 및 자동 시작
- [x] 건너뛰기/다음/이전 네비게이션
- [x] 4개 언어 지원 (한/영/일/중)

### 스크립트 AI 자동 완성
- [x] 스크립트 편집 시 AI 다음 문장 제안 백엔드 라우터 (scriptAutocomplete)
- [x] 인라인 자동 완성 UI (탭으로 수락, Esc로 거부)
- [x] 디바운스 처리 (타이핑 중지 후 1.5초 대기)
- [x] 자동 완성 토글 on/off 설정 (localStorage 저장)

### 아바타 프리셋 패키지
- [x] 프리셋 데이터 정의 (전문 강사, 친근한 진행자, 뉴스 앵커, 크리에이티브 MC, 상담사, 비즈니스 프레젠터)
- [x] 프리셋 선택 UI (아바타 추가 다이얼로그 preset 탭 상단에 배치)
- [x] 프리셋 선택 시 이름+역할+음성 자동 설정
- [x] 4개 언어 지원 (한/영/일/중)

## v4.9 초대 디자인 축소 + 음성 성별/언어 표기 + 강사 음성 업로드

### 초대 기능 디자인 축소
- [x] 공동 작업자 패널 크기 축소 (컴팩트 디자인)
- [x] 버튼 크기 줄이기
- [x] 전체 레이아웃 간결하게

### 음성 성별/언어 표기
- [x] 각 음성 옆에 성별 표시 (♂/♀ 아이콘)
- [x] 지원 언어 표시 (GEMINI_VOICES에 gender/languages 필드 추가)
- [x] 음성 선택 드롭다운 개선 (LectureBuilder, AvatarSettingsDialog, AvatarCustomizePanel 모두 적용)

### 강사 음성 업로드 기능
- [x] 강사 음성 파일 업로드 옵션 추가 (MP3/WAV/M4A/WebM/OGG, 10MB 제한)
- [x] 음성 클론 기능 연동 (기존 voiceClone 활용)
- [x] 업로드된 음성으로 클론 생성 가능

## v5.0 음성 업로드 100MB + 미리 듣기 + 작업 위치 자동 저장

### 음성 파일 업로드 용량 100MB
- [ ] AvatarSettingsDialog 파일 크기 제한 10MB → 100MB 변경
- [ ] 서버 측 업로드 제한도 100MB로 변경

### 음성 미리 듣기 버튼
- [ ] 음성 선택 드롭다운에 미리 듣기 버튼(▶) 추가
- [ ] 선택한 음성으로 샘플 문장 TTS 생성 후 재생
- [ ] LectureBuilder, AvatarSettingsDialog, AvatarCustomizePanel 모두 적용

### 마지막 작업 위치 자동 저장
- [ ] 현재 스텝/프로젝트 ID를 localStorage에 자동 저장
- [ ] 페이지 재방문 시 마지막 작업 위치로 자동 복귀
- [ ] 복귀 시 토스트 알림 표시

## 진짜 AI 음성 클로닝 기능 (v5.0)
- [x] DB 스키마: voiceClones 테이블에 matchedVoiceId, voiceAnalysis 컬럼 추가
- [x] DB 스키마: projectAvatars 테이블에 voiceCloneId 컬럼 추가
- [x] 백엔드: voiceClone.create에 AI 음성 분석 파이프라인 추가 (LLM으로 음성 특성 분석 → Gemini 음성 매칭)
- [x] 백엔드: voiceClone.preview에 매칭된 음성으로 TTS 생성하도록 수정
- [x] 백엔드: voiceClone.generateTTS 라우터 추가 (클론 음성으로 스크립트 전체 TTS)
- [x] 백엔드: lectureBuilder.updateAvatar에 voiceCloneId 저장 지원 추가
- [x] 프론트엔드: Voice Clone 탭 UI 개선 (클로닝 진행 상태, 분석 결과 표시)
- [x] 프론트엔드: 클론 음성 선택 시 아바타에 연결하여 저장
- [x] 프론트엔드: 클론 음성으로 미리듣기 기능 강화
- [x] i18n: 음성 클로닝 관련 번역 키 추가 (20개 언어)
- [x] 테스트: 음성 클로닝 기능 테스트 작성 (29개 통과)
- [x] 빌드 및 프로덕션 배포

## 음성 클로닝 강화 (v5.1)
- [x] 백엔드: voiceClone.preview에 speed/pitch 파라미터 추가
- [x] 백엔드: voiceClone.generateTTS에 speed/pitch 파라미터 추가
- [x] 백엔드: voiceClone.testVoice 라우터 추가 (녹음 → AI 매칭 정확도 비교 테스트)
- [x] 백엔드: 기본 음성 5가지 프리셋 정의 (voiceClone.presets 라우터)
- [x] 프론트엔드: 클론 음성 속도 슬라이더 UI (0.5x ~ 2.0x)
- [x] 프론트엔드: 클론 음성 피치 슬라이더 UI (-12 ~ +12 반음)
- [x] 프론트엔드: 실제 음성 테스트 기능 UI (녹음 → 원본/클론 비교 재생)
- [x] 프론트엔드: 기본 음성 5가지 프리셋 선택 UI (클론 없이도 사용 가능)
- [x] i18n: 새 기능 관련 번역 키 추가 (20개 언어, 28개 키)
- [x] 테스트: 새 기능 vitest 테스트 작성 (66개 통과)

## 음성 클로닝 강화 v5.2
- [x] DB: projectAvatars에 voiceSpeed, voicePitch 컬럼 추가
- [x] DB: voiceEffectPresets 테이블 생성 (커스텀 프리셋 저장용)
- [x] 백엔드: updateAvatar에 voiceSpeed/voicePitch 저장 지원
- [x] 백엔드: voiceEffectPreset CRUD 라우터 (create/list/delete)
- [x] 프론트엔드: 아바타 설정 저장 시 speed/pitch 값도 DB에 저장
- [x] 프론트엔드: 아바타 설정 열 때 저장된 speed/pitch 값 불러오기
- [x] 프론트엔드: A/B 비교 테스트 UI (원본 샘플 vs 클론 음성 나란히 재생)
- [x] 프론트엔드: 커스텀 프리셋 저장/불러오기/삭제 UI
- [x] i18n: 새 기능 번역 키 추가 (20개 언어, 17개 키)
- [x] 테스트: v5.2 기능 vitest 테스트 작성 (54개 통과)

## 음성 클로닝 강화 v5.3
### 다중 샘플 분석
- [x] DB: voiceCloneSamples 테이블 추가 (클론별 여러 샘플 관리)
- [x] 백엔드: voiceCloneSample.add 라우터 (기존 클론에 추가 샘플 업로드)
- [x] 백엔드: voiceCloneSample.analyzeCombined 라우터 (다중 샘플 결합 분석 → 더 정확한 매칭)
- [x] 프론트엔드: 기존 클론에 추가 샘플 업로드 UI
- [x] 프론트엔드: 샘플 목록 표시 및 개별 삭제

### 커뮤니티 프리셋 라이브러리
- [x] DB: voiceEffectPresets에 isPublic, usageCount, likes, userName 컬럼 추가
- [x] 백엔드: voiceEffectPreset.publish 라우터 (프리셋 공개)
- [x] 백엔드: voiceEffectPreset.community 라우터 (공개 프리셋 목록, 정렬/검색)
- [x] 백엔드: voiceEffectPreset.like 라우터 (좋아요)
- [x] 백엔드: voiceEffectPreset.copy 라우터 (내 프리셋으로 복사)
- [x] 프론트엔드: 커뮤니티 프리셋 라이브러리 탭 UI (인기순/최신순 정렬)
- [x] 프론트엔드: 프리셋 공개/비공개 토글
- [x] 프론트엔드: 좋아요 및 복사 버튼

### 실시간 음성 분석
- [x] 백엔드: voiceCloneSample.analyzeRealtime 라우터 (짧은 녹음 즉시 분석)
- [x] 프론트엔드: 녹음 중/후 실시간 분석 결과 표시 (파형, 특성, 매칭 음성)
- [x] 프론트엔드: 분석 진행 애니메이션

### 공통
- [x] i18n: 새 기능 번역 키 추가 (20개 언어, 30개 키)
- [x] 테스트: v5.3 기능 vitest 테스트 작성 (49개 통과)

## 버그 수정: AI 얼굴 생성 404 에러
- [x] gemini-2.0-flash-preview-image-generation 모델 404 에러 → gemini-2.5-flash-preview-image-generation으로 교체 + Forge 실패 시 Gemini fallback 추가

## PPT → AI 자동 스크립트 생성 (유료 기능) (v6.0)

#### DB 스키마
- [x] 기존 userSubscriptions.creditsRemaining + creditTransactions 테이블 활용
- [x] creditUsageLogs feature enum에 ppt_script_generation 추가
- [x] CREDIT_COSTS에 ppt_script_generation: 5 추가
### 백엔드
- [x] lectureBuilder.generateScriptFromPPT - AI가 PPT 슬라이드 분석 → 슬라이드별 스크립트 자동 생성 (크레딧 차감)
- [x] lectureBuilder.getPPTScriptCredits - 사용자 크레딧 잔액 조회
- [x] 기존 Stripe 크레딧 결제 시스탬 활용 (ppt_script_generation 크레딧 상품)
- [x] 결제 완료 시 크레딧 자동 충전 (기존 webhook 처리 활용)

### 프론트엔드
- [x] LectureBuilder 슬라이드 단계에 "PPT 업로드 & AI 스크립트 생성" 버튼 추가
- [x] PPT 업로드 모달 (파일 선택 → 업로드 → AI 분석 진행 표시)
- [x] 생성된 스크립트 미리보기 및 슬라이드별 적용 UI
- [x] 크레딧 부족 시 결제 유도 모달 (Stripe Checkout)
- [x] 크레딧 잔액 표시 UI

## 음성 파일 업로드 기능 (v6.0)

### 백엔드
- [x] voiceClone.uploadFile - 음성 파일(.mp3, .wav, .m4a, .ogg, .webm) 업로드 → S3 → AI 분석

### 프론트엔드
- [x] AvatarSettingsDialog Voice Clone 탭에 파일 업로드 버튼 추가 (녹음 버튼 옆)
- [x] 지원 포맷 안내 및 파일 크기 제한 (16MB)
- [x] 업로드 진행률 표시 및 분석 결과 연동

## 슬라이드별 직접 녹음 + 음성 모드 선택 (v6.0)

### DB 스키마
- [x] slideScripts 테이블에 voiceMode 컨럼 추가 ('direct_record' | 'ai_clone' | 'ai_tts')
- [x] slideScripts 테이블에 recordedAudioUrl 컨럼 추가

### 백엔드
- [x] lectureBuilder.setSlideVoiceMode - 슬라이드별 음성 모드 설정
- [x] lectureBuilder.uploadSlideRecording - 슬라이드별 직접 녹음 파일 업로드

### 프론트엔드
- [x] LectureBuilder 매칭 에디터에 음성 모드 선택 UI (3가지 모드)
- [x] 직접 녹음 모드: 슬라이드별 녹음 버튼 + 녹음 UI + 재생 미리듣기
- [x] AI 클론 음성 모드: 선택된 아바타의 클론 음성으로 TTS 생성
- [x] 기본 TTS 모드: 기본 Gemini TTS 음성 사용
- [x] 각 슬라이드별 현재 음성 모드 시각적 표시

### 공통
- [x] 테스트: v6.0 기능 vitest 테스트 작성 (5개 통과)
- [ ] i18n: 새 기능 번역 키 추가 (20개 언어)

## AI 클론 음성 TTS 실제 연동 (v6.1)
### 백엔드
- [x] lectureBuilder.generateCloneVoice - 프로필 음성 샘플 기반 AI 클로닝 TTS 생성
- [x] 음성 프로필에서 voiceClone 데이터 조회 → Gemini TTS에 voice 파라미터 적용
- [x] 생성된 클론 음성 S3 저장 및 slideScripts에 연결
### 프론트엔드
- [x] AI 클론 모드 선택 시 "클론 음성 생성" 버튼 활성화
- [x] 생성 진행 상태 표시 및 완료 후 미리듣기

## PPT 스크립트 자동 저장 (v6.1)
### 백엔드
- [x] lectureBuilder.applyPPTScripts - 생성된 스크립트를 slideScripts에 일괄 저장
### 프론트엔드
- [x] PPTAIScriptPanel에 "전체 적용" 버튼 추가
- [x] 개별 슬라이드 스크립트 "적용" 버튼 추가
- [x] 적용 완료 시 Step4 매칭 에디터에 반영

## 크레딧 구매 전용 페이지 (v6.1)
### 백엔드
- [x] 기존 payment.createCreditCheckout 활용 (4개 패키지: 50/200/500/2000)
### 프론트엔드
- [x] CreditDashboard 페이지에 패키지 구매 섹션 직접 추가
- [x] 4가지 패키지 카드 UI (인기 배지 포함)
- [x] Stripe Checkout 연동 완료
- [x] 기존 /credits 라우트 활용

## 구간별 자동저장 + 직접 저장 버튼 (v6.1)
### 백엔드
- [x] lectureBuilder.saveSlideScripts - 슬라이드 스크립트 일괄 자동저장
### 프론트엔드
- [x] Step4 매칭 에디터에 "저장하기" 버튼 추가
- [x] 30초 간격 자동저장 (debounce)
- [x] 자동저장 상태 표시 (마지막 저장 시간)
- [x] 변경 감지 시 "저장되지 않은 변경사항" 배지 표시

### 공통
- [x] 테스트: v6.1 기능 vitest 테스트 작성 (27개 통과)

## 슬라이드 전환 시 자동저장 (v6.2)
- [x] Step4 매칭 에디터에서 슬라이드 전환(selectedSlideIndex 변경) 시 자동저장 트리거
- [x] 변경사항 있을 때만 저장 (hasUnsavedChanges 체크)
- [x] 저장 완료 후 상태 업데이트

## AI 클론 음성 일괄 생성 (v6.2)
### 백엔드
- [x] lectureBuilder.batchGenerateCloneVoice - 모든 슬라이드 스크립트를 한 번에 AI 클론 음성으로 생성
- [x] 순차 처리 (슬라이드 순서대로) + 진행률 반환
### 프론트엔드
- [x] Step4 매칭 에디터에 "전체 AI 클론 음성 생성" 버튼 추가
- [x] 일괄 생성 진행 상태 표시 (N/M 슬라이드 완료)
- [x] 생성 완료 시 전체 결과 요약 토스트

## 크레딧 사용 내역 상세화 (v6.2)
### 백엔드
- [x] credits.usageStats - 기능별 크레딧 소모량 통계 조회
- [x] 기간별(7일/30일/전체) 필터링 지원
### 프론트엔드
- [x] CreditDashboard에 기능별 크레딧 소모량 위젯 추가
- [x] 비율 바 차트 (기능별 비율 + 퍼센트)
- [x] 최근 사용 내역 리스트 (기능명, 크레딧 수, 날짜)
- [x] 기간 필터 (7일/30일/전체)
- [x] 일별 사용 추이 미니 바 차트

### 공통
- [x] 테스트: v6.2 기능 vitest 테스트 작성 (17개 통과)

## AI 클론 음성 품질 미리듣기 (v6.3)
### 프론트엔드
- [x] BatchCloneVoiceButton 클릭 시 바로 생성 대신 확인 모달 표시
- [x] 확인 모달에서 첫 번째 슬라이드로 미리 테스트 생성 버튼
- [x] 테스트 생성 완료 후 오디오 미리듣기 플레이어 표시
- [x] "품질 확인 후 전체 생성" 버튼으로 일괄 생성 진행
- [x] "취소" 버튼으로 모달 닫기

## 크레딧 소진 알림 (v6.3)
### 백엔드
- [x] credit.checkLowBalance - 잔여 크레딧 10 이하 체크 프로시저
- [x] notifyOwner 활용하여 크레딧 소진 알림 이메일 발송
### 프론트엔드
- [x] CreditDashboard 상단에 잔여 크레딧 10 이하 시 경고 배너 표시
- [x] 크레딧 사용 시 잔여 10 이하면 토스트 경고 표시
- [x] 배너에 "크레딧 충전하기" 바로가기 버튼

## 스크립트 버전 관리 (v6.3)
### DB 스키마
- [x] 기존 slideScriptVersions 테이블 활용 (slideScriptId, version, scriptText, createdAt)
### 백엔드
- [x] lectureBuilder.listScriptVersions - 슬라이드별 스크립트 수정 이력 조회
- [x] lectureBuilder.restoreScriptVersion - 이전 버전으로 복원
- [x] 스크립트 저장 시 자동으로 버전 기록 (saveSlideScripts에 createSlideScriptVersion 연동)
### 프론트엔드
- [x] Step4 매칭 에디터에 "버전 이력" 버튼 추가 (VersionHistoryButton)
- [x] 버전 이력 다이얼로그 (시간순 목록 + 복원 버튼)
- [x] 복원 시 확인 다이얼로그

### 공통
- [x] 테스트: v6.3 기능 vitest 테스트 작성 (19개 통과)

## AI 클론 음성 속도/피치 슬라이더 (v6.4)
### 백엔드
- [x] generateCloneVoice 라우터에 speed, pitch 파라미터 추가
- [x] batchGenerateCloneVoice 라우터에 speed, pitch 파라미터 추가
- [x] Gemini TTS 호출 시 speed/pitch 설정 적용
### 프론트엔드
- [x] BatchCloneVoiceButton 미리듣기 모달에 속도 슬라이더 (0.5x~2.0x)
- [x] BatchCloneVoiceButton 미리듣기 모달에 피치 슬라이더 (-12~+12)
- [x] 슬라이더 값 변경 시 미리 테스트 재생성 가능
- [x] 전체 생성 시 설정된 속도/피치 값 적용

## 월정액 구독 크레딧 자동 충전 (v6.4)
### 백엔드
- [x] Stripe Subscription 상품 정의 (Starter/Professional/Business/Enterprise 월정액)
- [x] payment.createCreditSubscription - 구독 결제 세션 생성 (mode: subscription)
- [x] payment.subscriptionStatus - 현재 구독 상태 조회
- [x] payment.cancelSubscription - 구독 취소 (cancel_at_period_end)
- [x] Stripe webhook: invoice.payment_succeeded 이벤트 시 크레딧 자동 충전
- [x] 기존 userSubscriptions 테이블 활용 (stripeSubscriptionId, status, cancelAtPeriodEnd)
### 프론트엔드
- [x] MySubscription 페이지에 4가지 구독 플랜 카드 UI (월/연 전환)
- [x] 현재 구독 상태 표시 (활성/비활성/취소 예정)
- [x] 구독 취소 버튼 + 확인 다이얼로그
- [x] 가격 정보 실제 SUBSCRIPTION_PRODUCTS와 동기화

### 공통
- [x] 테스트: v6.4 기능 vitest 테스트 작성 (18개 통과)

## AI 클론 음성 발음 미세 조정 (v6.5)
### DB 스키마
- [x] pronunciationGuides 테이블 생성 (userId, projectId, word, phonetic, language, createdAt)
### 백엔드
- [x] lectureBuilder.addPronunciationGuide - 발음 가이드 추가
- [x] lectureBuilder.getPronunciationGuides - 프로젝트별 발음 가이드 목록 조회
- [x] lectureBuilder.updatePronunciationGuide - 발음 가이드 수정
- [x] lectureBuilder.deletePronunciationGuide - 발음 가이드 삭제
- [x] generateCloneVoice에 발음 가이드 적용 (스크립트 전처리)
- [x] batchGenerateCloneVoice에 발음 가이드 적용
### 프론트엔드
- [x] 발음 가이드 편집기 패널 (단어 → 발음 매핑 테이블)
- [x] 발음 가이드 추가/수정/삭제 UI
- [x] 스크립트 내 발음 가이드 적용 단어 하이라이트 표시
- [x] 개별 단어 발음 미리듣기 버튼
- [x] Step4 매칭 에디터에 "발음 설정" 버튼 추가

### 공통
- [x] 테스트: v6.5 기능 vitest 테스트 작성 (25개 통과)

## 발음 미세 조정 UI 다국어 번역 (v6.5.1)
- [x] PronunciationGuideButton 하드코딩 텍스트를 i18n 키로 교체
- [x] PronunciationHighlight 하드코딩 텍스트를 i18n 키로 교체
- [x] LectureBuilder.ts i18n 파일에 20개 언어 번역 추가 (ko, en, zh, ja, vi, th, id, ms, es, fr, de, pt, ru, ar, hi, it, nl, pl, sv, tr)

## 버그 수정: 강의 포맷 선택 화면 선택 옵션 미표시 (v6.5.2)
- [ ] 인원 구성 섹션에 선택 가능한 옵션 카드/버튼 표시 안됨
- [ ] 강의 스타일 섹션에 선택 가능한 옵션 카드/버튼 표시 안됨
- [ ] 추가 삽입 요소 섹션에 선택 가능한 옵션 카드/버튼 표시 안됨
- [ ] AI 얼굴 갤러리에서 내 음성(클론 보이스) 프로필을 아바타에 매칭할 수 있는 기능 확인/개선

## 버그/개선: 포맷 선택 + 음성 선택 (v6.5.3)
- [x] 강의 포맷 선택 화면에서 인원구성/강의스타일/추가삽입요소 선택 카드가 표시되지 않는 버그 수정 (scriptTemplate.list를 protectedProcedure로 변경 + 에러 상태 처리 추가)
- [x] 아바타 추가 시 음성 선택 드롭다운에서 개인 클론 음성이 프리셋보다 먼저 표시되도록 개선 (voiceClone.list 쿼리 추가, 개인 음성 섹션 상단 배치)
