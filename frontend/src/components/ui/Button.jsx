import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-main text-white hover:bg-primary-hover shadow-sm",
        destructive:
          "bg-red-500 text-white hover:bg-red-600",
        outline:
          "border border-input bg-background hover:bg-slate-100/50 text-slate-700",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-primary-main underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  const {
    as,
    asChild = false,
    children,
    type,
    ...rest
  } = props

  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild) {
    const child = React.Children.only(children)

    if (!React.isValidElement(child)) {
      return null
    }

    return React.cloneElement(child, {
      ...rest,
      ...child.props,
      ref,
      className: cn(classes, child.props.className),
    })
  }

  const Component = as || "button"

  return (
    <Component
      className={classes}
      ref={ref}
      type={Component === "button" ? type : undefined}
      {...rest}
    >
      {children}
    </Component>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
