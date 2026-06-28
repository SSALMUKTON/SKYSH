import { prisma } from "@/lib/prisma";

/**
 * 데모 사용자. [owner: P1]
 * MVP 는 인증을 붙이지 않고 단일 데모 유저로 동작한다(추후 Supabase auth 매핑).
 * clauses/precheck/execute/trades 등 모든 라우트가 같은 유저를 공유하도록 여기서 단일화.
 */
export const DEMO_USER_EMAIL = "demo@goraeso.dev";

export function getDemoUser() {
  return prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { email: DEMO_USER_EMAIL, name: "데모 투자자" },
  });
}
