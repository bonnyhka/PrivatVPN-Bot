'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('Frontend Application Error:', error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex max-w-sm flex-col items-center text-center p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        
        <h2 className="mb-2 text-xl font-bold tracking-tight">Сбой интерфейса</h2>
        
        <p className="mb-8 text-sm text-foreground/60 leading-relaxed">
          Произошла непредвиденная ошибка при загрузке данных. Пожалуйста, перезагрузите интерфейс.
        </p>

        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <RefreshCcw className="h-4 w-4" />
          Сбросить интерфейс
        </button>
        
        {/* Optional: Show small error digest for debugging */}
        {error?.digest && (
           <p className="mt-4 text-[10px] text-foreground/20 font-mono text-center">
             Error ID: {error.digest}
           </p>
        )}
      </motion.div>
    </div>
  )
}
