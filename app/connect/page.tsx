import { Suspense } from 'react'
import ConnectClient from './connect-client'

export const metadata = {
  title: 'Подключение PrivatVPN',
  description: 'Выберите приложение для быстрой настройки VPN',
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <ConnectClient />
    </Suspense>
  )
}
