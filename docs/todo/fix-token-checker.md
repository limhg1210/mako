# tokenChecker.ts 수정 필요

## 현재 문제점

`src/lib/claude/tokenChecker.ts`의 `checkTokenAvailability()`가 항상 `true`를 반환한다.

원인은 두 가지:

### 1. 파일 경로 오류

- **코드**: `~/.claude/statsig-cache.json`
- **실제**: `~/.claude/stats-cache.json`

파일이 존재하지 않으므로 17~19행의 early return으로 `true`가 반환된다.

### 2. 데이터 구조 불일치

코드는 `dailyModelTokens`를 `Record<string, Record<string, number>>`(오브젝트)로 가정하지만, 실제 구조는 배열이다.

**코드가 기대하는 구조:**
```json
{
  "dailyModelTokens": {
    "2026-02-12": {
      "claude-opus-4-6": 50003
    }
  }
}
```

**실제 `stats-cache.json` 구조:**
```json
{
  "version": 2,
  "dailyModelTokens": [
    {
      "date": "2026-02-12",
      "tokensByModel": {
        "claude-opus-4-6": 50003
      }
    }
  ]
}
```

## 수정 방향

### 파일 경로 수정

```typescript
// Before
const STATS_CACHE_PATH = path.join(os.homedir(), ".claude", "statsig-cache.json");

// After
const STATS_CACHE_PATH = path.join(os.homedir(), ".claude", "stats-cache.json");
```

### 인터페이스 및 파싱 로직 수정

```typescript
interface DailyModelTokenEntry {
  date: string;
  tokensByModel: Record<string, number>;
}

interface StatsCache {
  version: number;
  dailyModelTokens?: DailyModelTokenEntry[];
}
```

토큰 조회 로직:

```typescript
const today = new Date().toISOString().split("T")[0];
const todayEntry = stats.dailyModelTokens.find((entry) => entry.date === today);

if (!todayEntry) {
  return true;
}

const totalUsed = Object.values(todayEntry.tokensByModel).reduce(
  (sum, count) => sum + count,
  0
);
```

### 추가 고려사항

- `DAILY_TOKEN_LIMIT`(500,000)과 `TOKEN_THRESHOLD`(0.8) 값의 적절성 검토 필요. Claude Code의 실제 일일 토큰 한도는 플랜마다 다르고, `stats-cache.json`에 기록되는 토큰 수는 output token만 집계된 것으로 보임.
- `stats-cache.json`의 `modelUsage` 필드에 `inputTokens`, `outputTokens`, `cacheReadInputTokens` 등 세분화된 정보가 있으므로 더 정확한 판단이 가능할 수 있음.
- 이 파일은 Claude Code CLI가 자체적으로 관리하는 로컬 통계 파일이므로 구조가 버전업 시 변경될 수 있음에 유의.
