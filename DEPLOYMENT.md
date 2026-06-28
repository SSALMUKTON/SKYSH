# Vercel 배포 가이드

## 📋 사전 준비
- GitHub 계정 (SKYSH 저장소 연결됨)
- Google Gemini API Key
- Supabase 데이터베이스 연결 정보

## 🚀 배포 단계

### 1단계: Vercel 프로젝트 생성
```bash
# 터미널에서
npm install -g vercel
vercel login
# GitHub 계정으로 로그인
```

### 2단계: 프로젝트 배포 (처음)
```bash
cd /Users/jihun/Downloads/workspace/SKYSH
vercel
# 또는 웹사이트에서: https://vercel.com/import → SKYSH 선택
```

### 3단계: 환경 변수 설정

Vercel 대시보드에서 **Settings → Environment Variables** 추가:

| 변수 | 값 | 설명 |
|------|-----|------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@HOST:6543/postgres?pgbouncer=true` | Supabase Pooled Connection |
| `DIRECT_URL` | `postgresql://postgres:PASSWORD@HOST:5432/postgres` | Supabase Direct Connection |
| `GEMINI_API_KEY` | `sk-...` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `BROKER_PROVIDER` | `mock` | 또는 `kis` (현재: mock) |
| `NEXT_PUBLIC_APP_URL` | `https://skysh.vercel.app` | 배포 후 실제 URL로 변경 |

### 4단계: 배포 후 데이터베이스 마이그레이션

배포 완료 후 아래 커맨드 실행:

```bash
# Vercel 환경 변수 로컬에 다운로드
vercel env pull

# Prisma 마이그레이션 (데이터베이스 스키마 생성)
npx prisma db push
```

또는 Vercel Deployment → **Logs** 탭에서 빌드 로그 확인.

### 5단계: 배포 확인
```bash
# Vercel 대시보드 또는
vercel --prod
```

## ✅ 체크리스트

- [ ] GitHub 계정 로그인
- [ ] DATABASE_URL, DIRECT_URL 환경 변수 추가
- [ ] GEMINI_API_KEY 추가
- [ ] NEXT_PUBLIC_APP_URL 설정
- [ ] 배포 완료 확인
- [ ] `npx prisma db push` 실행
- [ ] https://skysh.vercel.app 접속 확인

## 🔄 업데이트

코드 변경 후 GitHub에 push하면 자동으로 Vercel에 배포됩니다.

```bash
git add .
git commit -m "feat: add feature"
git push  # 자동으로 Vercel에 배포됨
```

## 🐛 문제 해결

### 빌드 실패
- Vercel 대시보드 → **Deployments** → 실패한 배포 → **Logs** 확인
- 보통 환경 변수 누락이나 Prisma 마이그레이션 문제

### 데이터베이스 연결 실패
```bash
# 로컬에서 테스트
vercel env pull
npx prisma db push
```

### Gemini API 오류
- API Key 유효한지 확인
- https://aistudio.google.com/app/apikey 에서 새 키 생성
- Vercel 환경 변수 업데이트

## 📞 참고
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
