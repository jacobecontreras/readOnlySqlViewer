import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-[#e5ff88]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[#202c28]',
        ghost: 'bg-ghost text-ghost-foreground hover:bg-white/5',
      },
      size: {
        default: 'h-11 px-4 py-2',
        lg: 'h-12 px-5 py-3',
        sm: 'h-9 rounded-xl px-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)
