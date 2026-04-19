import { cn } from '../lib/utils.js'

function BrandPlaceholder({ className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="HireMatrix"
      className={cn(
        'h-10 w-10 shrink-0 rounded-xl object-contain',
        className,
      )}
    />
  )
}

export default BrandPlaceholder
