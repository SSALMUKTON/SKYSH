/** 네비게이션 직후 서버 데이터 로딩 동안 즉시 보여줄 스켈레톤(스트리밍). */
export default function Loading() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="h-7 w-28 bg-muted/60 animate-pulse mb-2" />
          <div className="h-4 w-80 bg-muted/40 animate-pulse mb-4" />
          <div className="h-11 w-full max-w-xl bg-muted/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            <div className="h-[360px] bg-muted/40 animate-pulse" />
            <div className="h-40 bg-muted/30 animate-pulse" />
          </div>
          <div className="col-span-1 h-[420px] bg-muted/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
