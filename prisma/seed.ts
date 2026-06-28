/**
 * 로컬 개발용 시드 데이터.
 *   실행:  npm run db:seed   (DATABASE_URL 설정 + db push/migrate 선행 필요)
 *
 * 데모 유저 1명과 유언 조항 2개(급등 추격·손절 없음)를 만든다. spec.md P4 의
 * 조항 시드(CHASE_SURGE, NO_STOP_LOSS)와 일치. P4 가 룰/조항을 확장하세요.
 */
import { PrismaClient, RuleType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@goraeso.dev" },
    update: {},
    create: { email: "demo@goraeso.dev", name: "데모 투자자" },
  });

  await prisma.clause.deleteMany({ where: { userId: user.id } });
  await prisma.clause.createMany({
    data: [
      {
        userId: user.id,
        ruleType: RuleType.CHASE_SURGE,
        params: { window: "1h", pct: 15 },
        displayText: "급등 직후(최근 1시간 +15% 이상) 시장가로 추격 매수하지 않는다.",
      },
      {
        userId: user.id,
        ruleType: RuleType.NO_STOP_LOSS,
        params: {},
        displayText: "손절 기준 없는 거래는 시작하지 않는다.",
      },
    ],
  });

  console.log(`✅ seed 완료: user=${user.email}, 조항 2개`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
