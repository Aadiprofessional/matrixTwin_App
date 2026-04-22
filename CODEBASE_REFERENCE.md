# MatrixTwin React Native — Complete Codebase Reference

Source of truth: `/buildsphere-main/src/` (the production web app)
RN project root: `/MatrixTwinAPP/`

---

## 1. BRAND & IDENTITY

| Item | Value |
|---|---|
| App name | MatrixTwin |
| Tagline | Digital Construction Platform |
| Logo file (web) | `src/assets/MatrixAILogo.png` |
| Brand positioning | "Trusted by construction leaders worldwide" |

---

## 2. DESIGN TOKENS (exact values from `tailwind.config.js`)

### Colors

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#FF5722` | Brand orange — buttons, accents, active states |
| `primaryDark` | `#E64A19` | Hover/pressed state of primary |
| `primaryLight` | `#FF8A65` | Soft highlight |
| `background` | `#0a0a0a` | Screen background |
| `surface` | `#111111` | Card / panel background |
| `surfaceElevated` | `#1a1a1a` | Input fields, raised surfaces |
| `border` | `#323845` | Default border color |
| `borderLight` | `#424242` | Lighter border |
| `text` | `#ffffff` | Primary text |
| `textSecondary` | `#b0b0b0` | Subtitles, helper text |
| `textMuted` | `#6d6d6d` | Placeholders, disabled |
| `success` | `#05c27b` | Completed / approved |
| `warning` | `#ffa500` | On-hold / pending |
| `error` | `#ff455d` | Errors, destructive |
| `info` | `#FF5722` | Same as primary |
| `white` | `#ffffff` | — |
| `black` | `#000000` | — |

### Status badge colors (project status)

| Status value | Color |
|---|---|
| `active` / `in_progress` | `#05c27b` (success green) |
| `planning` | `#ffc107` (amber) |
| `on_hold` | `#ffa500` (warning orange) |
| `completed` | `#9e9e9e` (grey) |
| Default | `#FF5722` (primary) |

### Typography (Tailwind → React Native px)

| Tailwind class | RN fontSize | Usage |
|---|---|---|
| `text-xs` | 11 | Caption, tiny labels |
| `text-sm` | 13 | Helper text, badges |
| `text-base` | 15 | Body text |
| `text-lg` | 18 | Subheadings |
| `text-xl` | 22 | Section headers |
| `text-2xl` | 28 | Card titles |
| `text-3xl` | 34 | Screen titles |
| `text-4xl` | 40 | Hero h1 |
| `text-5xl` | 52 | Large hero |
| `text-6xl` / `text-7xl` | 64–76 | Full-screen hero |

Font weight mapping: `font-medium`=`500`, `font-semibold`=`600`, `font-bold`=`700`, `font-extrabold`=`800`
Font families: `Inter` (body), `Space Grotesk` (display/headings), `JetBrains Mono` (mono/code)

### Spacing (Tailwind p-/m- → RN)

| Tailwind | px |
|---|---|
| `p-1` / `gap-1` | 4 |
| `p-2` | 8 |
| `p-3` | 12 |
| `p-4` | 16 |
| `p-5` | 20 |
| `p-6` | 24 |
| `p-8` | 32 |
| `p-10` | 40 |
| `p-12` | 48 |

### Border radius

| Tailwind | RN |
|---|---|
| `rounded` | 4 |
| `rounded-md` | 6 |
| `rounded-lg` | 8 |
| `rounded-xl` | 12 |
| `rounded-2xl` | 16 |
| `rounded-full` | 9999 |

---

## 3. BACKEND / API

### Base URL
```
https://server.matrixtwin.com/api
```
Set in `src/utils/api.ts` → `API_BASE_URL`

### Authentication mechanism
- JWT token returned by `/auth/login`
- Stored in `localStorage` key `"token"` on web → **MMKV key `auth_token`** on RN
- Sent as `Authorization: Bearer <token>` header on every request
- On 401: clear token + redirect to Login
- User profile stored under `localStorage` key `"user"` on web → **MMKV key `auth_user`** on RN (JSON stringified)

### Auth endpoints

| Method | Path | Payload | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token: string, user: User }` |
| POST | `/auth/signup` | `{ name, email, password, turnstileToken? }` | `{ token?, user?, message?, success? }` |
| GET | `/auth/me` | — | `User` object |

### Project endpoints

| Method | Path | Response |
|---|---|---|
| GET | `/projects/list` | `Project[]` — all projects visible to user |
| GET | `/projects/:id` | `Project` single object |
| POST | `/projects/create` | new `Project` |
| PUT | `/projects/:id` | updated `Project` |
| DELETE | `/projects/:id` | — |
| GET | `/projects/:id/members` | `ProjectMember[]` |
| POST | `/projects/:id/members` | assign members `{ userIds: string[] }` |
| POST | `/projects/assign` | `{ project_id, user_id, role, creator_uid }` |

### Dashboard endpoint

| Method | Path | Response |
|---|---|---|
| GET | `/global-forms/dashboard?projectId=&userId=` | `{ total_forms, pending_total, completed_total, by_type: {} }` |

### Other available endpoints (from `api.ts`)

| Category | Endpoints |
|---|---|
| Safety | `/safety/create`, `/safety/list/:userId?projectId=`, `/safety/:id`, `/safety/:id/update` |
| Labour | `/labour/create`, `/labour/list/:userId?projectId=`, `/labour/:id`, `/labour/:id/update` |
| Company | `/companies/:id`, `/companies/join` |
| Admin requests | `/admin-requests/request-admin`, `/admin-requests/my-request` |

---

## 4. DATA MODELS

### User (from `lib/supabase.ts`)
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'projectManager' | 'siteInspector' | 'contractor' | 'worker' | 'user';
  company_id?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  notifications_enabled?: boolean;
  theme_preference?: 'light' | 'dark';
  language_preference?: string;
  is_verified?: boolean;
  status?: string;        // 'approved' | 'pending' | etc.
  created_at?: string;
  updated_at?: string;
}
```

### Project (from `Projects.tsx`)
```typescript
interface Project {
  id: string;
  name: string;
  image_url: string;
  location: string;
  client: string;
  deadline: string;
  description: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  status: string;         // 'active' | 'planning' | 'on_hold' | 'completed' | 'in_progress'
  progress?: number;      // 0-100
}
```

### Dashboard stats (from `Dashboard.tsx`)
```typescript
interface DashboardStats {
  total_forms: number;
  pending_total: number;
  completed_total: number;
  by_type: {
    [key: string]: {
      type: string;
      label: string;
      total: number;
      pending: number;
      completed: number;
    }
  }
}
```

---

## 5. AUTH FLOW

### Web flow (replicated in RN)
1. User lands on `/login` → `LoginScreen`
2. Submit `{ email, password }` → POST `/auth/login`
3. Response `{ token, user }` → store both (MMKV)
4. `RootNavigator` sees `token` is truthy → renders `AppNavigator`
5. On logout: clear MMKV keys `auth_token` + `auth_user` → `RootNavigator` reverts to `AuthNavigator`

### Token refresh
- Web calls `GET /auth/me` after login to get fresh user data
- RN should do the same (call `getCurrentUser()` after `setToken`)

### Role-based access (web `ProtectedRoute`)
| Role | Capabilities |
|---|---|
| `admin` | Full access to all routes |
| `projectManager` | Team, Forms, Reports, Analytics |
| `siteInspector` | Dashboard, Diary, Safety, Labour, RFI |
| `contractor` | Team, Forms, Reports, Analytics |
| `worker` | Basic project views |
| `user` | Restricted — must join a company first |

---

## 6. ROUTING MAP (Web → RN screens)

| Web route | Web component | RN screen | RN navigator |
|---|---|---|---|
| `/` | `HomePage` | `OnboardingScreen` | `AuthNavigator` |
| `/login` | `Login` | `LoginScreen` | `AuthNavigator` |
| `/signup` | `Signup` | `SignupScreen` | `AuthNavigator` |
| `/projects` | `Projects` | `ProjectsScreen` | `AppNavigator` (tab) |
| `/dashboard/:projectId` | `Dashboard` | `HomeScreen` | `AppNavigator` (tab) |
| `/dashboard/:projectId/...` | various pages | future screens | — |
| `/settings` | `SettingsPage` | `ProfileScreen` | `AppNavigator` (tab) |
| project detail | (modal in Projects.tsx) | `ProjectDetailScreen` | `AppNavigator` (stack) |

---

## 7. LANDING PAGE CONTENT (for Onboarding slides)

### Hero section (`HomePage.tsx`)
- **Headline**: "MatrixTwin — Digital Construction Platform"
- **Mobile headline**: "MatrixTwin Platform"
- **Subheading**: "Trusted by construction leaders worldwide. Powered by advanced AI and digital twin technology. Create virtual replicas of your construction sites, monitor with IoT sensors, generate custom documentation, analyze real-time data, and collaborate with your team—all in one integrated platform."
- **CTA button text**: "Start managing projects" (desktop) / "Get Started" (mobile)

### Feature section titles (`FeatureSection.tsx`)
1. **Digital Twin Technology** — "Create precise virtual replicas of your construction projects for real-time monitoring, simulation, and optimization."
2. **Integrated Project Management** — "Streamline workflows with our comprehensive project management tools. Track tasks, manage resources, monitor budgets."
3. **IoT Sensor Integration** — "Monitor environmental conditions, equipment usage, and safety parameters with real-time IoT sensor data."
4. **Smart Documentation & Forms** — "Create custom documentation templates for site diaries, inspections, safety reports, and more."

### Use Cases (tabs in `UseCasesSection.tsx`)
Digital Twins · Project Management · IoT Integration · Documentation & Forms · Team Collaboration · Analytics & Insights

### FAQ questions (`HomePage.tsx`)
1. What features does MatrixTwin offer?
2. How do digital twins help in construction projects?
3. How does the IoT integration work?
4. Can I create custom forms for my project documentation?
5. How does AI enhance the digital construction process?
6. Do you offer enterprise solutions?

---

## 8. WEB COMPONENT → RN TRANSLATION GUIDE

### `<Button variant="primary">` → RN
```jsx
<TouchableOpacity style={{ backgroundColor: '#FF5722', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 }}>
  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Label</Text>
</TouchableOpacity>
```

### `<Input label="Email" error="...">` → RN
```jsx
<Text style={labelStyle}>{label}</Text>
<TextInput
  style={[inputStyle, error && errorInputStyle]}
  placeholderTextColor="#6d6d6d"
/>
{error && <Text style={errorTextStyle}>{error}</Text>}
```

### Project status badge (web uses `<span className="px-3 py-1 bg-black/50 ...">`) → RN
```jsx
<View style={{ backgroundColor: statusColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{status}</Text>
</View>
```

### Stat card (web `Dashboard.tsx` summaryCards) → RN
```jsx
<View style={{ backgroundColor: '#111111', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#323845' }}>
  <Text style={{ color: '#6d6d6d', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>CARD TITLE</Text>
  <Text style={{ color: '#fff', fontSize: 36, fontWeight: '700', marginTop: 8 }}>42</Text>
</View>
```

---

## 9. FORM VALIDATION SCHEMAS (web uses manual validation, replicated with Zod in RN)

### Login schema
```typescript
z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
```

### Signup schema
```typescript
z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
```

---

## 10. RN PROJECT STRUCTURE (what exists now)

```
MatrixTwinAPP/
├── App.tsx                          ✅ QueryClientProvider + GestureHandler + RootNavigator
├── src/
│   ├── api/
│   │   ├── client.ts               ✅ Axios + base URL + token interceptor + 401 handler
│   │   ├── auth.ts                 ✅ login(), signup(), getCurrentUser()
│   │   └── projects.ts             ✅ getProjects(), getProjectById(), CRUD
│   ├── store/
│   │   ├── authStore.ts            ✅ token, user, isAuthenticated, setToken, setUser, logout
│   │   └── projectStore.ts         ✅ projects, selectedProject, setProjects, setSelectedProject
│   ├── theme/
│   │   ├── colors.ts               ✅ All brand colors from tailwind.config.js
│   │   ├── typography.ts           ✅ All font sizes mapped from Tailwind
│   │   └── spacing.ts              ✅ Full spacing + radius scale
│   ├── utils/
│   │   └── storage.ts              ✅ MMKV instance
│   ├── navigation/
│   │   ├── RootNavigator.tsx       ✅ token ? AppNavigator : AuthNavigator
│   │   ├── AuthNavigator.tsx       ✅ Onboarding → Login → Signup
│   │   └── AppNavigator.tsx        ⚠️  Needs ProjectDetail screen added
│   └── screens/
│       ├── onboarding/
│       │   └── OnboardingScreen.tsx ✅ 3 slides, dot indicators, Skip + Next/Get Started
│       ├── auth/
│       │   ├── LoginScreen.tsx     ✅ react-hook-form + Zod + API + MMKV storage
│       │   └── SignupScreen.tsx    ❌ Needs building
│       ├── home/
│       │   └── HomeScreen.tsx      ❌ Needs building
│       ├── projects/
│       │   └── ProjectsScreen.tsx  ❌ Needs building
│       └── profile/
│           └── ProfileScreen.tsx   ❌ Needs building
```

---

## 11. SCREENS TO BUILD (priority order)

### SignupScreen (`src/screens/auth/SignupScreen.tsx`)
Fields: `name`, `email`, `password`, `confirmPassword`
Validation: Zod (same as web manual validation)
On submit: `POST /auth/signup` → if token returned, auto-login; if just message, navigate to Login with email pre-filled
Error: inline `apiError` state
Link: "Already have an account? Log in" → navigate to Login
Style: same card pattern as LoginScreen

### HomeScreen (`src/screens/home/HomeScreen.tsx`)
- Header: "Good morning / afternoon / evening, {user.name}" + date
- Stat cards (2-col grid): Total Forms, Pending, Completed (from `/global-forms/dashboard`)
- "Recent Projects" heading
- FlatList of last 5 projects (from `useQuery(['projects'], getProjects)`)
- Each row: project name, status badge, deadline/date
- Pull-to-refresh: refetch
- Empty state: "No projects yet" message
- Requires selected project for dashboard stats → show stats only if projects exist

### ProjectsScreen (`src/screens/projects/ProjectsScreen.tsx`)
- `useQuery(['projects'], getProjects)` → array
- Loading state: `SkeletonPlaceholder` cards
- `ProjectCard` component: image placeholder (colored block), title (uppercase), status badge, location (with pin icon), client name, deadline
- Status badge colors from section 2
- Tap any card → `navigation.navigate('ProjectDetail', { projectId: project.id })`
- Pull-to-refresh: `refetch()`
- Empty state card

### ProjectDetailScreen (`src/screens/projects/ProjectDetailScreen.tsx`)
- Route params: `{ projectId: string }`
- `useQuery(['project', projectId], () => getProjectById(projectId))`
- Header: project name (uppercase) + status badge (same style as web)
- "LIVE" pulse dot + date (from web Dashboard header)
- Metadata section: Location, Client, Deadline, Description
- Back button in header (handled by navigation)
- Bottom section: "Open Dashboard" button (placeholder for future)

### ProfileScreen (`src/screens/profile/ProfileScreen.tsx`)
- User avatar circle (initial letter)
- Name, email, role badge
- Company ID or "No company assigned"
- "Sign out" button → `useAuthStore().logout()`

---

## 12. NAVIGATION CHANGES NEEDED

### AppNavigator.tsx
Add a stack navigator wrapping the tab navigator so `ProjectDetailScreen` can be pushed on top:
```
AppStack (NativeStackNavigator)
├── MainTabs (BottomTabNavigator)
│   ├── Home (HomeScreen)
│   ├── Projects (ProjectsScreen)
│   └── Profile (ProfileScreen)
└── ProjectDetail (ProjectDetailScreen)  ← pushed from ProjectsScreen
```

Type param list:
```typescript
export type AppStackParamList = {
  MainTabs: undefined;
  ProjectDetail: { projectId: string };
};
```

---

## 13. DEPENDENCIES ALREADY INSTALLED

All installed via `npm install --legacy-peer-deps`:

| Package | Purpose |
|---|---|
| `@tanstack/react-query` | Server state — `useQuery`, `useMutation` |
| `zustand` | Client state — auth store, project store |
| `react-native-mmkv` | Persistent key-value storage (replaces localStorage) |
| `axios` | HTTP client |
| `react-hook-form` | Form state management |
| `@hookform/resolvers` | Zod adapter for react-hook-form |
| `zod` | Schema validation |
| `@react-navigation/native` | Navigation container |
| `@react-navigation/native-stack` | Stack navigator |
| `@react-navigation/bottom-tabs` | Tab navigator |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-screens` | Native screen optimization |
| `react-native-gesture-handler` | Gesture support |
| `react-native-reanimated` | Animations |
| `react-native-linear-gradient` | Gradient backgrounds |
| `react-native-vector-icons` | Icons (deprecated — use emoji or custom SVG) |
| `react-native-skeleton-placeholder` | Loading skeletons |
| `dayjs` | Date formatting |

---

## 14. KNOWN ISSUES

| Issue | Fix |
|---|---|
| `package.json` had `react@^18.3.1` | Fixed to `react@19.2.3` |
| `react-native-fast-image` has peer dep cap at React 18 | Using `npm install --legacy-peer-deps` |
| `pod install` failing | Run from `ios/` dir after `npm install` completes |
| `react-native-vector-icons` deprecated | Already warned; use emoji icons in screens for now |
