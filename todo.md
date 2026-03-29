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
