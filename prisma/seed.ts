/**
 * 로컬 개발용 시드 데이터.
 *   실행:  npm run db:seed   (DATABASE_URL 설정 + db push/migrate 선행 필요)
 *
 * 데모 유저 1명과 유언 조항 2개를 만들어, 프론트(P2)·규칙엔진(P4)이
 * 바로 화면/로직을 붙여볼 수 있게 합니다. 조항 시드는 P4 가 확장하세요.
 */
import { PrismaClient, RuleType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@skysh.dev" },
    update: {},
    create: { email: "demo@skysh.dev", name: "데모 투자자" },
  });

  // 기존 시드 조항 제거 후 재생성 (idempotent)
  await prisma.willClause.deleteMany({ where: { userId: user.id } });
  await prisma.willClause.createMany({
    data: [
      {
        userId: user.id,
        ruleType: RuleType.STOP_LOSS,
        params: { pct: 7 },
        displayText: "한 종목에서 7% 이상 손실이 나면 미련 없이 손절한다.",
      },
      {
        userId: user.id,
        ruleType: RuleType.NO_AVERAGING_DOWN,
        params: {},
        displayText: "물타기는 하지 않는다. 근거가 깨졌으면 추가 매수 대신 정리한다.",
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
