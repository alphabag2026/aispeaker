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
