# 알고타 (Algo-Way) 프론트엔드 구현 계획

> **작성일** 2026-03-30
> **기준 백엔드** v1.7.0 (40개 REST API + WebSocket 7 이벤트)
> **플랫폼** Web (모바일 우선 반응형 디자인)

---

## 목차

1. [프로젝트 구조 재편](#1-프로젝트-구조-재편)
2. [기술 스택](#2-기술-스택)
3. [폴더 구조](#3-폴더-구조)
4. [페이지 및 컴포넌트 설계](#4-페이지-및-컴포넌트-설계)
5. [상태 관리 전략](#5-상태-관리-전략)
6. [API 연동 전략](#6-api-연동-전략)
7. [WebSocket 연동](#7-websocket-연동)
8. [카카오 지도 연동](#8-카카오-지도-연동)
9. [인증 전략](#9-인증-전략)
10. [환경 변수 관리](#10-환경-변수-관리)
11. [개발 단계별 로드맵](#11-개발-단계별-로드맵)

---

## 1. 프로젝트 구조 재편

### 1-1. 모노레포 구조

`backend/`와 `frontend/`를 대칭 디렉토리로 배치한다.  
루트 `package.json`은 npm workspaces 전용 관리자 역할만 수행한다.

```
algoway/                        ← 루트 (Workspace 관리자 전용)
│
├── backend/                    ← 🛠️ Node.js + Express 백엔드
│   ├── src/
│   ├── server.ts
│   ├── tsconfig.json
│   ├── Dockerfile / Dockerfile.dev
│   └── package.json
│
├── frontend/                   ← 📱 Next.js 프론트엔드
│   ├── src/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── infra/                      ← 🏗️ 공유 인프라 설정 (Redis 등)
├── docs/                       ← 📄 프로젝트 문서
├── docker-compose.yml          ← build context: ./backend
├── docker-compose.dev.yml
└── package.json                ← workspaces: ["backend", "frontend"]
```

**선택 근거**

- `backend/src/`와 `frontend/src/`가 동일한 깊이로 대칭 → 일관성 확보
- 루트는 워크스페이스 조율 전용 → 관심사 분리 명확
- 배포는 백엔드(Railway/Render)와 프론트엔드(Vercel)를 독립적으로 진행

### 1-2. 공유 타입 패키지 (선택사항)

향후 백엔드-프론트엔드 간 타입을 공유할 경우, `packages/shared/` 패키지로 분리한다.  
초기에는 프론트엔드가 자체 타입을 정의하는 것으로 시작하되, 중복이 커지면 분리한다.

---

## 2. 기술 스택

| 분류 | 기술 | 선택 근거 |
|---|---|---|
| 프레임워크 | **Next.js 14** (App Router) | SSR/SSG 지원, 파일 기반 라우팅, Vercel 최적화 |
| 언어 | TypeScript 5.x | 백엔드와 타입 공유 가능, 타입 안전성 |
| 스타일링 | **TailwindCSS 3.x** | 유틸리티 클래스 기반, 빠른 개발, 반응형 용이 |
| UI 컴포넌트 | **shadcn/ui** | Radix UI 기반, 접근성 보장, 커스터마이징 자유도 |
| 상태 관리 | **Zustand** | 경량, 심플한 API, React 외부에서도 접근 가능 |
| 서버 상태 | **TanStack Query v5** | 캐싱, 재요청, 무한 스크롤, 낙관적 업데이트 |
| HTTP 클라이언트 | **Axios** | 인터셉터로 토큰 자동 갱신 처리 |
| WebSocket | **Socket.io-client** | 백엔드 Socket.io 서버와 호환 |
| 지도 | **Kakao Maps JavaScript API** | 기획서 명시 + 한국 지도 서비스 품질 |
| 폼 관리 | **React Hook Form + Zod** | 타입 안전한 폼 검증 |
| 날짜 처리 | **dayjs** | 경량, moment 대체 |
| 아이콘 | **lucide-react** | shadcn/ui 기본 아이콘 세트 |
| 린터/포매터 | ESLint + Prettier | 백엔드와 일관된 코드 스타일 |

---

## 3. 폴더 구조

```
frontend/
│
├── src/
│   │
│   ├── app/                            # Next.js App Router 페이지
│   │   ├── (auth)/                     # 인증 필요 없는 라우트 그룹
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # P02 - 로그인
│   │   │   └── signup/
│   │   │       ├── page.tsx            # P02 - 회원가입 (이메일 입력)
│   │   │       ├── verify/
│   │   │       │   └── page.tsx        # P02 - 인증 코드 입력
│   │   │       └── profile/
│   │   │           └── page.tsx        # P02 - 프로필 설정
│   │   │
│   │   ├── (main)/                     # 인증 필요 라우트 그룹
│   │   │   ├── layout.tsx              # 하단 네비게이션 바 포함
│   │   │   ├── home/
│   │   │   │   └── page.tsx            # P03 - 메인 피드 (지도 + 팟 목록)
│   │   │   ├── pods/
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx        # P05 - 팟 생성
│   │   │   │   └── [podId]/
│   │   │   │       └── page.tsx        # P04 - 팟 상세
│   │   │   ├── chat/
│   │   │   │   └── [roomId]/
│   │   │   │       └── page.tsx        # P06 - 채팅방
│   │   │   ├── search/
│   │   │   │   └── page.tsx            # P07 - 검색 & 필터
│   │   │   └── mypage/
│   │   │       ├── page.tsx            # P08 - 마이페이지
│   │   │       ├── edit/
│   │   │       │   └── page.tsx        # 프로필 수정
│   │   │       ├── rides/
│   │   │       │   └── page.tsx        # 탑승 내역
│   │   │       ├── routes/
│   │   │       │   └── page.tsx        # 즐겨찾는 경로
│   │   │       └── notifications/
│   │   │           └── page.tsx        # 알림 설정
│   │   │
│   │   ├── onboarding/
│   │   │   └── page.tsx                # P01 - 온보딩/스플래시
│   │   │
│   │   ├── layout.tsx                  # 루트 레이아웃 (Provider 주입)
│   │   ├── page.tsx                    # 루트 → 리다이렉트 처리
│   │   ├── not-found.tsx               # 404 페이지
│   │   └── globals.css                 # 전역 스타일 (TailwindCSS)
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui 기본 컴포넌트 (Button, Input, ...)
│   │   │
│   │   ├── auth/                       # 인증 관련 컴포넌트
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── VerifyEmailForm.tsx
│   │   │   └── ProfileSetupForm.tsx
│   │   │
│   │   ├── pods/                       # 팟 관련 컴포넌트
│   │   │   ├── PodCard.tsx             # 팟 카드 (목록용)
│   │   │   ├── PodList.tsx             # 팟 목록
│   │   │   ├── PodDetail.tsx           # 팟 상세 정보
│   │   │   ├── PodCreateForm.tsx       # 팟 생성 폼
│   │   │   ├── PodStatusBadge.tsx      # 팟 상태 뱃지
│   │   │   └── ParticipantList.tsx     # 참여자 목록
│   │   │
│   │   ├── chat/                       # 채팅 컴포넌트
│   │   │   ├── ChatRoom.tsx            # 채팅방 전체 레이아웃
│   │   │   ├── MessageBubble.tsx       # 메시지 말풍선
│   │   │   ├── MessageInput.tsx        # 메시지 입력창
│   │   │   ├── ReadyStatus.tsx         # 준비 완료 상태 표시
│   │   │   ├── TypingIndicator.tsx     # 타이핑 중 표시
│   │   │   └── PodInfoBanner.tsx       # 상단 팟 정보 배너
│   │   │
│   │   ├── map/                        # 카카오 지도 컴포넌트
│   │   │   ├── KakaoMap.tsx            # 기본 지도 컴포넌트
│   │   │   ├── PodMapView.tsx          # 팟 핀 표시 지도
│   │   │   ├── RouteMapView.tsx        # 경로 시각화 지도
│   │   │   └── LocationPicker.tsx      # 장소 검색 + 핀 설정
│   │   │
│   │   ├── layout/                     # 레이아웃 컴포넌트
│   │   │   ├── BottomNav.tsx           # 하단 네비게이션 바
│   │   │   ├── TopBar.tsx              # 상단 헤더
│   │   │   └── PageContainer.tsx       # 모바일 최대폭 컨테이너
│   │   │
│   │   ├── notifications/              # 알림 컴포넌트
│   │   │   ├── NotificationItem.tsx
│   │   │   └── NotificationBell.tsx
│   │   │
│   │   ├── rating/                     # 매너 평가 컴포넌트
│   │   │   ├── RatingModal.tsx         # 평가 제출 모달
│   │   │   └── MannerScore.tsx         # 매너 점수 표시
│   │   │
│   │   └── shared/                     # 공통 컴포넌트
│   │       ├── VerifiedBadge.tsx        # 인증 뱃지
│   │       ├── UserAvatar.tsx          # 사용자 아바타
│   │       ├── LoadingSpinner.tsx      # 로딩 스피너
│   │       ├── EmptyState.tsx          # 빈 상태 화면
│   │       ├── ErrorBoundary.tsx       # 에러 경계
│   │       └── ConfirmDialog.tsx       # 확인 다이얼로그
│   │
│   ├── hooks/                          # 커스텀 React Hook
│   │   ├── useAuth.ts                  # 인증 상태, 로그인/로그아웃
│   │   ├── usePods.ts                  # 팟 목록 조회 (TanStack Query)
│   │   ├── useChat.ts                  # 채팅방 WebSocket 연결
│   │   ├── useLocation.ts              # 브라우저 위치 정보
│   │   ├── useNotifications.ts         # 알림 목록/읽음처리
│   │   └── useDebounce.ts              # 검색 디바운싱
│   │
│   ├── lib/
│   │   ├── api/                        # API 클라이언트
│   │   │   ├── client.ts               # Axios 인스턴스 + 인터셉터
│   │   │   ├── auth.ts                 # Auth API 함수
│   │   │   ├── users.ts                # Users API 함수
│   │   │   ├── pods.ts                 # Pods API 함수
│   │   │   ├── chat.ts                 # Chat REST API 함수
│   │   │   ├── ratings.ts              # Ratings API 함수
│   │   │   └── notifications.ts        # Notifications API 함수
│   │   │
│   │   ├── socket/
│   │   │   ├── client.ts               # Socket.io 클라이언트 인스턴스
│   │   │   └── events.ts               # 이벤트 상수 (백엔드와 동기화)
│   │   │
│   │   ├── kakao/
│   │   │   ├── loader.ts               # 카카오 SDK 동적 로드
│   │   │   └── utils.ts                # 경로 검색, 좌표 변환 유틸
│   │   │
│   │   └── utils/
│   │       ├── date.ts                 # dayjs 날짜 포맷
│   │       ├── cost.ts                 # 1/n 비용 계산
│   │       └── validation.ts           # Zod 스키마 (공통 검증 규칙)
│   │
│   ├── store/                          # Zustand 상태 스토어
│   │   ├── authStore.ts                # 사용자 인증 정보, 토큰
│   │   ├── chatStore.ts                # 채팅 메시지, 참여자 온라인 상태
│   │   ├── podStore.ts                 # 팟 필터, 검색 조건
│   │   └── uiStore.ts                  # 모달, 토스트 등 UI 상태
│   │
│   └── types/
│       ├── api.ts                      # API 응답/요청 공통 타입
│       ├── auth.ts                     # 인증 관련 타입
│       ├── pod.ts                      # 팟 관련 타입
│       ├── chat.ts                     # 채팅 관련 타입
│       ├── user.ts                     # 사용자 관련 타입
│       ├── rating.ts                   # 평가 관련 타입
│       └── notification.ts             # 알림 관련 타입
│
├── public/
│   ├── icons/                          # PWA 아이콘
│   └── images/                         # 정적 이미지
│
├── .env.local.example                  # 환경 변수 예시
├── next.config.ts                      # Next.js 설정
├── tailwind.config.ts                  # TailwindCSS 설정
├── tsconfig.json                       # TypeScript 설정
└── package.json                        # 프론트엔드 패키지
```

---

## 4. 페이지 및 컴포넌트 설계

### P01 — 온보딩 (`/onboarding`)

**목적**: 서비스 첫인상 전달, 회원가입/로그인 유도

**구성**:
- 슬라이드 형태 서비스 소개 (3단계: 팟 매칭 / 채팅 / 인증 신뢰)
- [시작하기] → `/signup`, [로그인] → `/login` 버튼
- 로그인된 사용자 접근 시 `/home`으로 리다이렉트

**핵심 컴포넌트**: `OnboardingSlider`, `FeatureCard`

---

### P02 — 회원가입 & 인증 (`/signup`, `/login`)

**목적**: 이메일 인증 기반 신뢰 사용자 유입

**회원가입 플로우** (3단계 ProgressStepper):
1. `/signup` — 이메일 입력 → `POST /v1/auth/verify/send`
2. `/signup/verify` — 6자리 인증 코드 입력 → `POST /v1/auth/verify/confirm`
3. `/signup/profile` — 닉네임·유형·비밀번호 설정 → `POST /v1/auth/signup`

**로그인**:
- 이메일 + 비밀번호 → `POST /v1/auth/login`
- 로그인 유지 체크박스 (Refresh Token 갱신 주기 제어)

**핵심 컴포넌트**: `ProgressStepper`, `OtpInput` (6자리 인증 코드), `PasswordStrengthBar`

---

### P03 — 홈 피드 (`/home`)

**목적**: 핵심 기능 진입점 + 주변 팟 탐색

**레이아웃**:
| 영역 | 내용 |
|---|---|
| 상단 고정 | 출발지/도착지/시간 검색바 |
| 지도 영역 | 카카오 지도 + 내 위치 기반 팟 핀 |
| 하단 슬라이드 | 팟 카드 목록 (거리 가까운 순, 무한 스크롤) |
| FAB | [팟 만들기] 플로팅 버튼 |

**API**: `GET /v1/pods` (lat, lng, radius 파라미터)

**핵심 컴포넌트**: `SearchBar`, `PodMapView`, `PodList`, `PodCard`, `CreateFab`

---

### P04 — 팟 상세 (`/pods/[podId]`)

**목적**: 팟 정보 확인 후 참여 결정

**구성**:
- 지도: 출발지 → 도착지 경로 시각화 (카카오 길찾기)
- 팟 정보: 시간·인원·예상 비용(1/n)·픽업 포인트·이동 수단
- 참여자 목록: 닉네임 + 인증 뱃지 + 매너 점수
- [팟 참여하기] → `POST /v1/pods/:podId/join` → 채팅방 이동

**API**: `GET /v1/pods/:podId`, `POST /v1/pods/:podId/join`

**핵심 컴포넌트**: `RouteMapView`, `PodDetail`, `ParticipantList`, `VerifiedBadge`

---

### P05 — 팟 생성 (`/pods/create`)

**목적**: 새로운 카풀 팟 모집

**입력 폼**:
| 필드 | 컴포넌트 | 검증 |
|---|---|---|
| 출발지 | `LocationPicker` + 카카오 검색 | 필수 |
| 도착지 | `LocationPicker` + 카카오 검색 | 필수 |
| 출발 시간 | DateTimePicker | 미래 시간만 허용 |
| 최대 인원 | Stepper (2~4명) | 2 ≤ n ≤ 4 |
| 이동 수단 | RadioGroup (택시/개인차량) | 필수 |
| 메모 | Textarea | 선택, 100자 이내 |

**API**: `POST /v1/pods` → 생성 성공 시 채팅방으로 이동

---

### P06 — 채팅방 (`/chat/[roomId]`)

**목적**: 팟 참여자 간 실시간 소통

**레이아웃**:
| 영역 | 내용 |
|---|---|
| 상단 배너 | 팟 요약 (출발지→도착지, 시간, 인원 현황) |
| 메시지 목록 | 무한 스크롤 (위로 이전 메시지 로드) |
| 준비 상태 바 | 참여자별 준비 완료 여부 시각화 |
| 입력창 | 텍스트 + 📍 위치 공유 버튼 |

**WebSocket 이벤트**:
- 진입 시: `chat:join` 발송 → `chat:joined` 수신
- 메시지: `chat:message` 발송 → `chat:new_message` 구독
- 타이핑: `chat:typing` / `chat:stop_typing`
- 준비: `chat:ready` → `chat:ready_update` 수신
- 이탈: `chat:leave`

**REST API** (초기 데이터 로드): `GET /v1/chat/rooms/:roomId/messages`

---

### P07 — 검색 & 필터 (`/search`)

**목적**: 원하는 팟 정밀 탐색

**구성**:
- 출발지/도착지/시간대 입력
- 필터 패널 (Bottom Sheet):
  - 인증 사용자만 보기 (토글)
  - 이동 수단 (택시/개인차량/전체)
  - 거리 반경 슬라이더 (300m ~ 5km)
- 지도 뷰 ↔ 리스트 뷰 탭 전환

**API**: `GET /v1/pods` (다양한 query params)

---

### P08 — 마이페이지 (`/mypage`)

**목적**: 개인 정보 관리 + 이용 내역

**서브 페이지**:
| 경로 | 내용 | API |
|---|---|---|
| `/mypage` | 프로필 요약, 매너 점수 | `GET /v1/users/me` |
| `/mypage/edit` | 프로필 수정 | `PATCH /v1/users/me` |
| `/mypage/rides` | 탑승 내역 | `GET /v1/users/me/rides` |
| `/mypage/routes` | 즐겨찾는 경로 | `GET/POST/DELETE /v1/users/me/routes` |
| `/mypage/notifications` | 알림 설정 | `GET/PATCH /v1/notifications/settings` |

---

## 5. 상태 관리 전략

### 클라이언트 상태 (Zustand)

서버와 무관한 UI/인증 상태만 관리한다.

```typescript
// authStore — 인증 정보
interface AuthStore {
  user: User | null;           // 로그인 사용자 정보
  accessToken: string | null;  // 메모리에만 저장 (localStorage X)
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

// chatStore — 실시간 채팅 상태
interface ChatStore {
  messages: Record<string, Message[]>;  // roomId → messages
  onlineUsers: Record<string, string[]>; // roomId → userIds
  typingUsers: Record<string, string[]>; // roomId → userIds
  readyStatuses: Record<string, ReadyStatus[]>;
}

// uiStore — UI 상태
interface UiStore {
  isMapView: boolean;          // 지도/리스트 뷰 전환
  searchFilter: PodFilter;     // 검색 필터
  activeModal: ModalType | null;
}
```

### 서버 상태 (TanStack Query)

API 응답 캐싱, 자동 재요청, 낙관적 업데이트를 처리한다.

```typescript
// 팟 목록 — 위치 변경 시 자동 재조회
const { data: pods } = useQuery({
  queryKey: ['pods', location, filter],
  queryFn: () => fetchPods(location, filter),
  staleTime: 30_000,  // 30초 캐시
});

// 채팅 메시지 — 무한 스크롤
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['messages', roomId],
  queryFn: ({ pageParam }) => fetchMessages(roomId, pageParam),
  getNextPageParam: (lastPage) => lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
});

// 팟 참여 — 낙관적 업데이트
const { mutate: joinPod } = useMutation({
  mutationFn: joinPodApi,
  onMutate: async (podId) => {
    // 즉시 UI 업데이트 (서버 응답 전)
    await queryClient.cancelQueries({ queryKey: ['pods', podId] });
    // ...
  },
  onError: (err, podId, context) => {
    // 실패 시 롤백
    queryClient.setQueryData(['pods', podId], context?.previousPod);
  },
});
```

---

## 6. API 연동 전략

### Axios 인스턴스 및 토큰 자동 갱신

```typescript
// lib/api/client.ts

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + '/v1',
  withCredentials: true,
});

// 요청 인터셉터 — Access Token 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 응답 인터셉터 — 401 시 Refresh Token으로 재발급
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { accessToken } = await refreshTokenApi();
      useAuthStore.getState().setAccessToken(accessToken);
      error.config.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(error.config);
    }
    return Promise.reject(error);
  }
);
```

### API 함수 예시

```typescript
// lib/api/pods.ts
export const fetchPods = async (params: FetchPodsParams): Promise<PodsResponse> => {
  const { data } = await apiClient.get('/pods', { params });
  return data.data;
};

export const createPod = async (body: CreatePodBody): Promise<Pod> => {
  const { data } = await apiClient.post('/pods', body);
  return data.data.pod;
};

export const joinPod = async (podId: string): Promise<void> => {
  await apiClient.post(`/pods/${podId}/join`);
};
```

---

## 7. WebSocket 연동

### Socket.io 클라이언트 초기화

```typescript
// lib/socket/client.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      autoConnect: false,
      auth: { token: useAuthStore.getState().accessToken },
    });
  }
  return socket;
};

export const connectSocket = (token: string) => {
  const s = getSocket();
  s.auth = { token };
  s.connect();
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
```

### useChat 커스텀 훅

```typescript
// hooks/useChat.ts
export const useChat = (roomId: string) => {
  const socket = useMemo(() => getSocket(), []);
  const { addMessage, setTypingUsers } = useChatStore();

  useEffect(() => {
    socket.emit('chat:join', { roomId });

    socket.on('chat:new_message', (message: Message) => {
      addMessage(roomId, message);
    });

    socket.on('chat:user_typing', ({ userId }: { userId: string }) => {
      setTypingUsers(roomId, (prev) => [...prev, userId]);
    });

    return () => {
      socket.emit('chat:leave', { roomId });
      socket.off('chat:new_message');
      socket.off('chat:user_typing');
    };
  }, [roomId, socket]);

  const sendMessage = useCallback((content: string, type: 'text' | 'location' = 'text') => {
    socket.emit('chat:message', { roomId, content, type });
  }, [roomId, socket]);

  return { sendMessage };
};
```

---

## 8. 카카오 지도 연동

### SDK 동적 로드

```typescript
// lib/kakao/loader.ts
export const loadKakaoSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) { resolve(); return; }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
```

### KakaoMap 컴포넌트

```tsx
// components/map/KakaoMap.tsx
'use client';

const KakaoMap = ({ center, level = 4, children }: KakaoMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);

  useEffect(() => {
    loadKakaoSdk().then(() => {
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level,
      });
      setMap(map);
    });
  }, []);

  return (
    <div ref={mapRef} className="w-full h-full">
      {map && <MapContext.Provider value={map}>{children}</MapContext.Provider>}
    </div>
  );
};
```

**활용 기능**:
- 팟 핀 클러스터링 (MarkerClusterer)
- 장소 검색 (Places 서비스)
- 경로 시각화 (Polyline)
- 현재 위치 마커

---

## 9. 인증 전략

### 토큰 저장 방식

| 토큰 | 저장 위치 | 이유 |
|---|---|---|
| Access Token | **메모리(Zustand)** | XSS 공격으로 localStorage 탈취 방지 |
| Refresh Token | **httpOnly Cookie** | JS 접근 불가, CSRF는 SameSite=Strict으로 방어 |

> 백엔드에서 Refresh Token을 httpOnly Cookie로 Set-Cookie 처리 필요 (현재 Response Body 반환 방식이면 개선 검토)

### 인증 미들웨어 (Next.js Middleware)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/onboarding', '/login', '/signup'];

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasToken = request.cookies.has('refresh_token');

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublic && hasToken) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 10. 환경 변수 관리

```bash
# frontend/.env.local.example

# 백엔드 API 주소
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000

# 카카오 지도 API 키 (JavaScript 앱 키)
# https://developers.kakao.com → 내 애플리케이션 → 앱 키
NEXT_PUBLIC_KAKAO_MAP_KEY=your_kakao_javascript_key
```

**보안 원칙**:
- `NEXT_PUBLIC_` prefix: 브라우저에 노출되어도 무방한 공개 키만 사용
- 서버 전용 시크릿(JWT_SECRET 등)은 프론트엔드에 절대 포함하지 않는다

---

## 11. 개발 단계별 로드맵

### Phase 1 — 기반 구성 (~1주)

| 작업 | 내용 |
|---|---|
| 환경 세팅 | Next.js 14 프로젝트 초기화, TailwindCSS, shadcn/ui 설치 |
| Axios 클라이언트 | API 인스턴스, 토큰 자동 갱신 인터셉터 |
| Zustand 스토어 | authStore, uiStore 초기화 |
| 레이아웃 컴포넌트 | BottomNav, TopBar, PageContainer |
| 타입 정의 | 백엔드 API 응답 기준 TypeScript 타입 전체 작성 |

### Phase 2 — 인증 UI (v2.1)

| 작업 | API 연동 |
|---|---|
| 온보딩 페이지 | - |
| 이메일 입력 + OTP 발송 | `POST /v1/auth/verify/send` |
| OTP 인증 코드 입력 | `POST /v1/auth/verify/confirm` |
| 프로필 설정 + 회원가입 | `POST /v1/auth/signup` |
| 로그인 | `POST /v1/auth/login` |
| 토큰 자동 갱신 | `POST /v1/auth/token/refresh` |

### Phase 3 — 팟 핵심 기능 (v2.2)

| 작업 | API 연동 |
|---|---|
| 카카오 지도 통합 | 카카오 SDK |
| 홈 피드 (지도 + 목록) | `GET /v1/pods` |
| 팟 상세 페이지 | `GET /v1/pods/:podId` |
| 팟 참여 | `POST /v1/pods/:podId/join` |
| 팟 생성 | `POST /v1/pods` |
| 검색 & 필터 | `GET /v1/pods` |

### Phase 4 — 실시간 채팅 (v2.3)

| 작업 | 연동 |
|---|---|
| Socket.io 클라이언트 초기화 | WebSocket |
| 채팅방 UI (메시지 목록, 입력창) | WebSocket + REST |
| 실시간 메시지 송수신 | `chat:message` |
| 타이핑 인디케이터 | `chat:typing` |
| 준비 완료 상태 | `chat:ready` |
| 위치 공유 메시지 | `chat:message (location)` |

### Phase 5 — 마이페이지 & 알림 (v2.4)

| 작업 | API 연동 |
|---|---|
| 프로필 조회/수정 | `GET/PATCH /v1/users/me` |
| 탑승 내역 | `GET /v1/users/me/rides` |
| 즐겨찾는 경로 CRUD | `GET/POST/DELETE /v1/users/me/routes` |
| 알림 목록 + 읽음처리 | `GET/PATCH /v1/notifications` |
| 알림 설정 | `GET/PATCH /v1/notifications/settings` |
| 매너 평가 모달 | `POST /v1/ratings` |

### Phase 6 — 품질 개선 (v2.5)

| 작업 | 내용 |
|---|---|
| 에러 처리 | ErrorBoundary, Toast 알림 통합 |
| 로딩 상태 | Skeleton UI, Suspense 경계 |
| PWA | manifest.json, 서비스 워커 (오프라인 지원) |
| 접근성 | aria-label, 키보드 탐색, 색상 대비 |
| 성능 최적화 | 이미지 최적화, 코드 스플리팅, Dynamic Import |

---

## 버전 관리 계획

| 버전 | 내용 |
|---|---|
| v2.0.0 | Phase 1 완료 — 프론트엔드 기반 구성 |
| v2.1.0 | Phase 2 완료 — 인증 플로우 완성 |
| v2.2.0 | Phase 3 완료 — 팟 핵심 기능 |
| v2.3.0 | Phase 4 완료 — 실시간 채팅 |
| v2.4.0 | Phase 5 완료 — 마이페이지 & 알림 |
| v2.5.0 | Phase 6 완료 — 품질 개선 |

> 백엔드 버전(1.x.x)과 프론트엔드 버전(2.x.x)을 분리하여 독립적으로 관리한다.
