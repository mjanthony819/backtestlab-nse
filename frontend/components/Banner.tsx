export function WakeBanner({ slow }: { slow: boolean }) {
  if (!slow) return null;
  return (
    <div className="box px-4 py-3 mb-4 border-amber/40 text-amber text-[12px]">
      <span className="font-pixel text-[9px] mr-3">WAKING SERVER</span>
      The free-tier backend sleeps when idle. First request takes up to a minute. It stays fast after that.
    </div>
  );
}
export function ErrorBox({ msg }: { msg: string }) {
  return <div className="box px-4 py-3 mb-4 text-down text-[12px]"><span className="font-pixel text-[9px] mr-3">ERROR</span>{msg}</div>;
}
