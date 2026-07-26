import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'

interface BirthDateTimeFieldsProps {
  date: string
  onDateChange: (value: string) => void
  time: string
  onTimeChange: (value: string) => void
  timeUnknown: boolean
  onTimeUnknownChange: (value: boolean) => void
  unknownLabel?: string
}

export default function BirthDateTimeFields({
  date,
  onDateChange,
  time,
  onTimeChange,
  timeUnknown,
  onTimeUnknownChange,
  unknownLabel = "I don't know the exact birth time",
}: BirthDateTimeFieldsProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} required />
        <Input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={timeUnknown}
        />
      </div>
      <label className="mt-3 flex items-center gap-3 text-sm text-ink-muted">
        <Switch checked={timeUnknown} onCheckedChange={onTimeUnknownChange} />
        {unknownLabel}
      </label>
      {timeUnknown && (
        <p className="mt-2 text-xs text-ink-faint">
          We'll use local solar noon as a placeholder. Sign, nakshatra, and dasha still compute
          normally — ascendant and house-based reading will be marked approximate.
        </p>
      )}
    </div>
  )
}
