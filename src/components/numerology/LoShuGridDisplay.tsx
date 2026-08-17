// Classical Lo Shu magic-square layout — every row, column, and diagonal sums to 15. Fixed
// positions, not derived from the grid data itself.
const LO_SHU_LAYOUT = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
] as const

export default function LoShuGridDisplay({ grid }: { grid: Record<number, number> }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {LO_SHU_LAYOUT.flat().map((n) => {
        const count = grid[n] ?? 0
        return (
          <div
            key={n}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border border-line text-center"
          >
            {count > 0 ? (
              <span className="nums-tabular text-lg text-ink">{n.toString().repeat(count)}</span>
            ) : (
              <span className="text-xs text-ink-faint">—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
