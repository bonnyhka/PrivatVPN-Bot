'use client'

import { useToast } from '@/hooks/use-toast'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const tone = variant === 'destructive'
          ? {
              Icon: AlertCircle,
              iconWrap: 'bg-red-500 text-white',
            }
          : variant === 'success'
            ? {
                Icon: CheckCircle2,
                iconWrap: 'bg-emerald-500 text-white',
              }
            : {
                Icon: Info,
                iconWrap: 'bg-primary text-primary-foreground',
              }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}>
              <tone.Icon className="h-3 w-3" />
            </div>
            <div className="grid min-w-0 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
