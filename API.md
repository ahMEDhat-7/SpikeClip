# API Reference

All endpoints prefixed with `/api`. The API is not exposed directly — all traffic routes through the Next.js web app's internal proxy (`/api/[...path]/route.ts`).

## Authentication

SpikeClip uses **Google OAuth 2.0 only**. Sessions are cookie-based JWTs (`httpOnly`, signed with `JWT_SECRET`).

- `GET /api/auth/google` — Redirects to Google OAuth consent screen
- `GET /api/auth/google/callback` — Handles Google callback, sets `access_token` cookie, redirects to dashboard
- Subsequent requests include the cookie automatically (with `credentials: "include"`)
- Swagger UI can also use Bearer token in the Authorization header

## Health

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/health` | Public | Global | Health check (status, timestamp, uptime) |

## Auth

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/auth/google` | Public | 10/min | Redirect to Google OAuth consent |
| `GET` | `/api/auth/google/callback` | Public | 10/min | Google callback, sets JWT cookie |
| `POST` | `/api/auth/logout` | Public | Global | Clear JWT cookie |
| `GET` | `/api/auth/me` | Bearer | Global | Get current user profile |
| `PATCH` | `/api/auth/me` | Bearer | Global | Update profile (name) |

### Google OAuth Flow

1. Frontend redirects user to `GET /api/auth/google`
2. User consents on Google
3. Google redirects to `GET /api/auth/google/callback`
4. API creates/updates user, sets `access_token` cookie, redirects to `/dashboard`

### Logout

**Response (200):** Clears `access_token` cookie
```json
{ "message": "Logged out" }
```

### Get Profile

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "free",
  "analysesUsed": 1,
  "analysesLimit": 3,
  "scenesLimit": 3,
  "createdAt": "2026-07-12T12:00:00.000Z"
}
```

### Update Profile

**Request:**
```json
{
  "name": "Jane Doe"
}
```

**Response (200):** Updated user profile

---

## Jobs

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/jobs` | Bearer | 5/min | Create analysis job (quota enforced) |
| `GET` | `/api/jobs` | Bearer | Global | List user's jobs |
| `GET` | `/api/jobs/:id` | Bearer | Global | Get job by ID |
| `POST` | `/api/jobs/:id/process` | Bearer | 5/min | Run algorithm on heatmap |
| `POST` | `/api/jobs/:id/export` | Bearer | 3/min | Export clips for scenes |
| `GET` | `/api/clips/job/:jobId` | Bearer | Global | Get clips for job |

### Create Job

Free-tier users are limited to 3 analyses/month. Returns 403 if quota exceeded.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "url": "https://www.youtube.com/watch?v=...",
  "videoTitle": "Video Title",
  "videoThumbnail": "https://...",
  "videoDuration": 360.5,
  "videoViewCount": 1500000,
  "videoUploadDate": "2026-06-01",
  "videoChannelName": "Channel Name",
  "status": "pending",
  "createdAt": "2026-07-12T12:00:00.000Z"
}
```

### Get Job

**Response (200):**
```json
{
  "id": "uuid",
  "url": "https://www.youtube.com/watch?v=...",
  "videoTitle": "Video Title",
  "videoThumbnail": "https://...",
  "videoDuration": 360.5,
  "videoViewCount": 1500000,
  "videoUploadDate": "2026-06-01",
  "videoChannelName": "Channel Name",
  "status": "completed",
  "scenes": [
    {
      "start_time": 45.2,
      "end_time": 78.4,
      "duration": 33.2,
      "peak_intensity": 0.92,
      "avg_intensity": 0.78,
      "score": 0.85,
      "confidence": "high",
      "capped": false
    }
  ],
  "heatmapData": [
    { "start_time": 0, "end_time": 5, "value": 0.3 },
    { "start_time": 5, "end_time": 10, "value": 0.7 }
  ],
  "createdAt": "2026-07-12T12:00:00.000Z"
}
```

### Process Heatmap

Runs the spike merging algorithm on the job's heatmap data.

**Response (200):** Updated job with `scenes` populated.

### Export Clips

**Request:**
```json
{
  "scenes": [
    { "start_time": 45.2, "end_time": 78.4, "peak_intensity": 0.92 },
    { "start_time": 120.0, "end_time": 165.0, "peak_intensity": 0.85 }
  ],
  "platform": "youtube-shorts",
  "format": "mp4",
  "quality": "1080p",
  "captions": [
    {
      "text": "Check this out!",
      "font": "inter",
      "size": 48,
      "color": "#FFFFFF",
      "position": "center",
      "animation": "pop"
    }
  ],
  "music": {
    "fileKey": "user-id/track.mp3",
    "volume": 0.3,
    "originalVolume": 1.0,
    "fadeIn": 2,
    "fadeOut": 2
  },
  "templateId": "kinetic-typography",
  "templateConfig": { "textAnimation": "pop", "transitionIn": "fade" }
}
```

**Response (200):**
```json
{
  "jobId": "uuid",
  "clipJobIds": ["clip-uuid-1", "clip-uuid-2"]
}
```

---

## Studio (Editing)

The Studio API supports natural-language prompt translation and preview generation for per-scene `StudioAction[]` edits. Rendering uses the upstream **OpenReel engine** (`@openreel/core`) vendored at `vendor/openreel-video` for client-side WebCodecs/WebGPU export, with server-side `ffmpeg` as a fallback.

**Endpoints:**

- `POST /api/studio/translate-prompt` — translate a natural-language prompt into `StudioAction[]` commands.
- `POST /api/studio/generate-preview` — render a preview clip with the given actions.
- `POST /api/studio/save-actions` — persist per-scene `StudioAction[]` revisions for a job.

## Clips

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/api/clips/job/:jobId` | Bearer | Global | List clips by job ID |
| `GET` | `/api/clips/:id/download` | Bearer (Pro/Team) | Global | Download clip (redirect to signed URL) |
| `GET` | `/api/clips/download/:key` | Public | Global | Serve clip file (HMAC-signed URL) |

### List Clips

**Response (200):**
```json
[
  {
    "id": "clip-uuid",
    "jobId": "job-uuid",
    "sceneIndex": 0,
    "startTime": 45.2,
    "endTime": 78.4,
    "peakIntensity": 0.92,
    "status": "completed",
    "fileUrl": "clips/job-uuid/scene-0.mp4",
    "fileSize": 1048576,
    "duration": 33.2,
    "errorMessage": null,
    "createdAt": "2026-07-12T12:00:00.000Z"
  }
]
```

### Download Clip

**Flow:**
1. `GET /api/clips/:id/download` — verifies ownership + Pro/Team plan, generates HMAC-signed URL
2. Returns 302 redirect to `GET /api/clips/download/:key?expires=...&sig=...`
3. `GET /api/clips/download/:key` — verifies HMAC signature, streams file from storage (MinIO or local disk)

The signed URL points to the API's own endpoint, not directly to MinIO. The API handles all file serving internally.

---

## Music

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/api/music/upload` | Bearer | Global | Upload background music (max 10MB) |
| `DELETE` | `/api/music/:key` | Bearer | Global | Delete uploaded music |

### Upload Music

**Request:** `multipart/form-data` with `file` field (audio/mpeg, audio/wav, audio/ogg, audio/mp4)

**Response (201):**
```json
{
  "id": "user-id/uuid-filename.mp3",
  "name": "track.mp3",
  "url": "https://spikeclips.com/api/clips/download/...",
  "size": 1048576
}
```

### Delete Music

**Response (200):**
```json
{ "deleted": true }
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 302 | Redirect (signed URL) |
| 400 | Bad request (invalid input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (quota exceeded or plan required) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
