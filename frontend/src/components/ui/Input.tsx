interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-text-secondary">{label}</label>}
      <input
        className={`bg-surface border border-border rounded-[var(--radius-input)] px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
