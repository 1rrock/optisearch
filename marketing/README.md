# OptiSearch 마케팅 자동화 시스템

자동 발행 루틴 인프라 안내.

## 디렉토리 구조

```
marketing/
├── seo-keyword-pool.md         # 키워드 풀 (자동 발행 시 1개씩 소진)
├── guides-log.md               # guides 발행 로그
├── naver-drafts/               # 네이버 블로그 초안 (수동 발행용)
│   └── YYYY-MM-DD-{slug}.md    # 매일 자동 생성
├── instagram-log.md            # 인스타그램 발행 로그
└── threads-log.md              # 스레드 발행 로그 (정지 후 미사용)
```

## 채널별 자동화 현황

| 채널 | 자동화 수준 | 비고 |
|------|------|------|
| Instagram | 완전 자동 (Routine) | 매일 오전 10시 카드 이미지 발행 |
| guides (자사 도메인) | 완전 자동 (Routine) | 매일 1편 추가, 사용자가 git push |
| 네이버 블로그 | 사용 안 함 | 수동 발행 부담 큰 데 비해 효과 불확실 — guides 자사 SEO에 집중 |
| Threads | 정지됨 | 새 계정 운영 정책 위반으로 차단 |

## 루틴 등록

각 채널의 루틴 프롬프트는 Claude Code의 로컬 루틴 메뉴에 등록.
프롬프트 템플릿은 별도 문서 (`*-routine-prompt.md`)에서 관리.
