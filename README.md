# Last Judge

A competitive programming judge system built from scratch — like Codeforces, but engineered end-to-end by one developer.

## Overview

Last Judge is a full-featured backend for a competitive programming platform. It handles user authentication, problem management, code submission, real-time judging, and contest management.

The judge pipeline compiles and executes submitted C/C++ code in isolated child processes, enforces time and memory limits, and streams per-test-case verdicts to clients in real time via WebSockets.

## Architecture

```
Client
  │
  ▼
NestJS REST API
  │
  ├── Auth (JWT + Refresh Tokens)
  ├── Problems (CRUD, admin-only writes)
  ├── Test Cases
  ├── Submissions ──► BullMQ Queue ──► SubmissionProcessor
  │                                         │
  │                                    JudgeService
  │                                    (compile → run → verdict)
  │                                         │
  └── WebSocket Gateway ◄───────── Real-time status updates
  │
PostgreSQL (via Prisma)
Redis (BullMQ job queue)
```

## Features

### Authentication
- JWT access tokens (short-lived) + refresh token rotation
- bcrypt password hashing
- HTTP-only cookie handling
- Role-based access control (USER / ADMIN)

### Problems & Test Cases
- Full CRUD for problems (title, difficulty, topics, time limit, memory limit)
- Admin-only write access via `RolesGuard`
- Test case management with cascade deletes

### Judge Pipeline
- Submission queued via BullMQ backed by Redis
- Code compiled with `g++` in a child process
- Each test case run with enforced time limit (TLE detection via `setTimeout` + `proc.kill()`)
- Verdicts: `Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Compilation Error`, `Runtime Error`
- Temp files cleaned up in `finally` block after every submission
- Real-time status emitted via WebSocket: `compiling` → `Running on test N` → final verdict

### Contests
- Create contests with start/end times
- Register/unregister users
- Add/remove problems from contests
- Unique constraint on (contestId, userId) and (contestId, problemId)

### API
- Paginated `GET /problems` and `GET /submissions`
- Protected routes with `JwtAuthGuard`
- Global `ValidationPipe` with whitelist

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Queue | BullMQ + Redis |
| Real-time | WebSockets (Socket.io Gateway) |
| Auth | JWT + bcrypt |
| Compiler | g++ (C/C++ submissions) |

## Getting Started

### Prerequisites
- Node.js
- Docker (for PostgreSQL and Redis)
- g++ installed on the host machine

### 1. Start infrastructure

```bash
sudo docker start turbo-judge-db
sudo docker start turbo-judge-redis
```

### 2. Configure environment

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/turbo_judge"

JWT_SECRET=your_jwt_secret
JWT_EXPIRE_IN=1h

REFRESH_JWT_SECRET=your_refresh_secret
REFRESH_JWT_EXPIRE_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Start the server

```bash
npm run start:dev
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/login` | Login and receive tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Invalidate refresh token |

### Problems
| Method | Endpoint | Description |
|---|---|---|
| GET | `/problem` | List problems (paginated) |
| GET | `/problem/:id` | Get problem by ID |
| POST | `/problem` | Create problem (admin) |
| PATCH | `/problem/:id` | Update problem (admin) |
| DELETE | `/problem/:id` | Delete problem (admin) |

### Test Cases
| Method | Endpoint | Description |
|---|---|---|
| POST | `/testcase/:id` | Add test case to problem |
| GET | `/testcase/:id` | Get test cases for problem |
| DELETE | `/testcase/:id` | Delete test case |

### Submissions
| Method | Endpoint | Description |
|---|---|---|
| POST | `/submission` | Submit code (triggers judge pipeline) |
| GET | `/submission` | List submissions (paginated) |
| GET | `/submission/:id` | Get submission by ID |

### Contests
| Method | Endpoint | Description |
|---|---|---|
| POST | `/contest` | Create contest (admin) |
| GET | `/contest` | List contests |
| GET | `/contest/:id` | Get contest by ID |
| POST | `/contest/:id/register` | Register for contest |
| DELETE | `/contest/:id/unregister` | Unregister from contest |
| POST | `/contest/:id/problems` | Add problem to contest |
| DELETE | `/contest/:id/problems` | Remove problem from contest |

## WebSocket Events

Connect to the WebSocket server and listen for:

```
submission:status → { submissionId, status }
```

Status values: `compiling`, `Running on test N`, `Accepted`, `Wrong Answer on test N`, `TLE`, `Compilation Error`, `Runtime Error`

## Planned Improvements

- Docker-based sandbox isolation per submission (replace child process with containerized execution)
- Support for more languages (Python, Java)
- Contest leaderboard with real-time scoring
- Next.js frontend
- Rate limiting on submission endpoints
- Admin dashboard

## Database Schema

Core models: `User`, `Problem`, `TestCase`, `Submission`, `Contest`, `ContestProblem`, `ContestRegistration`, `RefreshToken`

Full schema available in [`prisma/schema.prisma`](./prisma/schema.prisma).
