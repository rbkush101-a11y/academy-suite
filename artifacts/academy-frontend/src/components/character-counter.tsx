export function CharacterCounter({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const remaining = max - current;
  const isWarn = remaining < 20;
  const isOver = remaining < 0;

  return (
    <p
      className={`mt-1 text-right text-[10px] ${
        isOver
          ? "text-red-600"
          : isWarn
            ? "text-amber-600"
            : "text-slate-400"
      }`}
    >
      {current} / {max} characters
    </p>
  );
}