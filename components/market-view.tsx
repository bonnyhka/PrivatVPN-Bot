'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ShoppingBag, Truck, Check, Package, MapPin, Phone, User, Loader2, Star, ChevronRight, ShieldCheck, Zap, Info, List, MessageSquare, Send } from 'lucide-react'
import type { AppView } from '@/lib/types'
import { useTelegramUser } from './providers/telegram-provider'
import { cn } from '@/lib/utils'

interface MarketViewProps {
  onNavigate: (view: AppView) => void
}

export function MarketView({ onNavigate }: MarketViewProps) {
  const { user } = useTelegramUser()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'specs' | 'reviews'>('info')
  const [showCheckout, setShowCheckout] = useState(false)
  
  // Checkout Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)

  // Review System
  const [newComment, setNewComment] = useState('')
  const [newRating, setNewRating] = useState(5)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    fetch('/api/market/product')
      .then(r => r.json())
      .then(d => {
        setProduct(d)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const handleOrder = async () => {
    if (!fullName || !phone || !address || !city) return alert('Заполните все поля')
    setIsOrdering(true)
    try {
      const res = await fetch('/api/market/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          fullName,
          phone,
          address,
          city
        })
      })
      const data = await res.json()
      if (data.success) {
        alert('Заказ создан! Менеджер свяжется с вами в ближайшее время.')
        setShowCheckout(false)
        onNavigate('home')
      } else { alert('Ошибка: ' + data.error) }
    } catch (e) { alert('Ошибка при создании заказа') }
    finally { setIsOrdering(false) }
  }

  const handleReviewSubmit = async () => {
    if (!newComment.trim()) return
    setIsSubmittingReview(true)
    try {
      const res = await fetch('/api/market/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: newRating,
          comment: newComment
        })
      })
      const data = await res.json()
      if (data.success) {
        setNewComment('')
        // Refresh product data to see new review
        const fresh = await fetch('/api/market/product').then(r => r.json())
        setProduct(fresh)
      }
    } catch (e) { console.error(e) }
    finally { setIsSubmittingReview(false) }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#0d0d0d]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  if (!product) return <div className="p-8 text-center text-white/40">Ошибка загрузки товара</div>

  const specs = JSON.parse(product.specs || '[]')
  const avgRating = product.reviews?.length 
    ? Math.round(product.reviews.reduce((a:any, r:any) => a + r.rating, 0) / product.reviews.length) 
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#0d0d0d] text-white overflow-x-hidden">
      {!showCheckout ? (
        <div className="animate-in fade-in duration-500 pb-36">
           {/* Header */}
           <div className="sticky top-0 z-50 flex items-center justify-between bg-[#0d0d0d]/80 px-4 py-4 backdrop-blur-xl border-b border-white/5">
              <button onClick={() => onNavigate('home')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-colors">
                 <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Market</h1>
              <div className="w-10" />
           </div>

           {/* Hero Section */}
           <div className="relative w-full px-4 pt-4">
              <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                 <img 
                   src={product.imageUrl} 
                   alt={product.name}
                   className="h-full w-full object-cover animate-in fade-in duration-700"
                 />
              </div>
           </div>

           {/* Product Title & Tabs */}
           <div className="mt-8 px-6">
              <div className="flex items-center gap-1.5 mb-3">
                 <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("h-3 w-3 transition-colors", s <= avgRating ? "text-yellow-500 fill-current" : "text-white/10 fill-current")} />)}
                 </div>
                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{product.reviews?.length || 0} Отзывов</span>
                 <span className="ml-auto text-[9px] font-mono text-white/20 tracking-tighter uppercase shrink-0 mt-0.5">CODE: {product.id.substring(0, 8).toUpperCase()}</span>
              </div>

              <h2 className="text-xl font-black text-white leading-tight mb-6 uppercase tracking-tight">
                 {product.name}
              </h2>

              {/* Responsive Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-white/5 mb-8">
                 {[
                   { id: 'info', label: 'Инфо', icon: Info },
                   { id: 'specs', label: 'Характеристики', icon: List },
                   { id: 'reviews', label: 'Отзывы', icon: MessageSquare }
                 ].map(tab => (
                   <button 
                     key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                     className={cn(
                       "flex items-center gap-1.5 px-3 pb-3 text-[10px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                       activeTab === tab.id ? "text-primary" : "text-white/30 hover:text-white/50"
                     )}
                   >
                     <tab.icon className="h-3.5 w-3.5" />
                     {tab.label}
                     {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(34,197,94,0.6)]" />}
                   </button>
                 ))}
              </div>

              {/* Tab Content Area - Scrollable but fixed min-height */}
              <div className="min-h-[250px]">
                 {activeTab === 'info' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                       <p className="text-sm text-white/50 leading-relaxed mb-8 font-medium">
                          {product.description}
                       </p>
                       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-4 rounded-3xl bg-white/5 p-5 border border-white/5">
                             <div className="bg-primary/20 p-2 rounded-xl text-primary"><Zap className="h-5 w-5" /></div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white/30 uppercase">Скорость</span>
                                <span className="text-sm font-black text-white uppercase italic-none">До 5 Гбит/с</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-4 rounded-3xl bg-white/5 p-5 border border-white/5">
                             <div className="bg-primary/20 p-2 rounded-xl text-primary"><ShieldCheck className="h-5 w-5" /></div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white/30 uppercase">Защита</span>
                                <span className="text-sm font-black text-white uppercase italic-none">VLESS Reality</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'specs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                       {specs.map((spec: any) => (
                          <div key={spec.label} className="flex flex-col gap-1 border-b border-white/5 pb-3">
                             <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">{spec.label}</span>
                             <span className="text-sm font-black text-white uppercase leading-none">{spec.value}</span>
                          </div>
                       ))}
                    </div>
                 )}

                 {activeTab === 'reviews' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                        {/* Rating Summary Block */}
                       {product.reviews?.length > 0 && (
                         <div className="flex items-center gap-6 rounded-[2rem] bg-white/5 p-6 border border-white/5">
                            <div className="flex flex-col items-center justify-center shrink-0">
                               <span className="text-5xl font-black text-white leading-none tracking-tighter">{avgRating.toFixed(1)}</span>
                               <div className="flex gap-0.5 mt-3">
                                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("h-3.5 w-3.5 transition-colors", s <= avgRating ? "text-yellow-500 fill-current" : "text-white/10 fill-current")} />)}
                               </div>
                               <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2">{product.reviews.length} Отзывов</span>
                            </div>
                            <div className="flex-1 space-y-2">
                               {[5, 4, 3, 2, 1].map(stars => {
                                  const count = product.reviews.filter((r:any) => r.rating === stars).length
                                  const percent = count ? (count / product.reviews.length) * 100 : 0
                                  return (
                                    <div key={stars} className="flex items-center gap-2">
                                      <div className="flex items-center gap-0.5 w-4 justify-end">
                                        <span className="text-[10px] font-bold text-white/50">{stars}</span>
                                      </div>
                                      <Star className="h-2.5 w-2.5 text-white/20 fill-current shrink-0" />
                                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                         <div className="h-full bg-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                                      </div>
                                    </div>
                                  )
                               })}
                            </div>
                         </div>
                       )}

                       {/* Add Review Box */}
                       <div className="rounded-[2rem] bg-white/[0.03] p-6 border border-white/10 shadow-2xl flex flex-col gap-5">
                          <div className="flex items-center justify-between">
                             <h4 className="text-sm font-extrabold text-white leading-none tracking-tight">Отзыв</h4>
                             <div className="flex gap-1 bg-black/40 px-3 py-1.5 rounded-[1rem] border border-white/5 shadow-inner">
                               {[1, 2, 3, 4, 5].map(s => (
                                 <button key={s} onClick={() => setNewRating(s)} className="active:scale-[0.8] transition-all duration-300">
                                   <Star className={cn("h-4 w-4 transition-colors", s <= newRating ? "text-yellow-500 fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" : "text-white/20")} />
                                 </button>
                               ))}
                             </div>
                          </div>
                          
                          <div className="flex flex-col gap-3">
                             <textarea 
                                value={newComment} onChange={e => setNewComment(e.target.value)}
                                placeholder="Как вам роутер? Расскажите о скорости..."
                                className="w-full min-h-[100px] bg-black/40 border border-white/5 rounded-[1.5rem] p-4 text-[13px] text-white font-medium placeholder:text-white/30 focus:border-white/20 focus:bg-black/60 outline-none transition-all resize-none shadow-inner"
                             />
                             <button 
                                onClick={handleReviewSubmit}
                                disabled={isSubmittingReview || !newComment.trim()}
                                className="w-full h-12 bg-white text-black rounded-[1.2rem] flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30"
                             >
                                {isSubmittingReview ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                                Опубликовать
                             </button>
                          </div>
                       </div>


                       {/* List of Reviews */}
                       <div className="space-y-4 pt-2">
                          {product.reviews?.length === 0 ? (
                            <div className="text-center py-10 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                               <Star className="h-8 w-8 text-white/10" />
                               <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Отзывов пока нет. Станьте первым!</span>
                            </div>
                          ) : (
                            product.reviews.map((r: any) => (
                               <div key={r.id} className="rounded-[2rem] bg-white/[0.02] p-6 border border-white/5 shadow-lg">
                                  <div className="flex items-start justify-between mb-4">
                                     <div className="flex items-center gap-4">
                                        <div className="h-11 w-11 rounded-[1.2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-black text-primary border border-primary/20 shadow-inner">
                                           {(r.userIdRel?.firstName || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="text-sm font-extrabold text-white leading-none mb-2">{r.userIdRel?.firstName || 'User'}</span>
                                           <div className="flex gap-1">
                                              {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn("h-3 w-3", s <= r.rating ? "text-yellow-500 fill-current" : "text-white/10 fill-current")} />)}
                                           </div>
                                        </div>
                                     </div>
                                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest pt-1">{new Date(r.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-sm text-white/60 leading-relaxed font-medium">{r.comment}</p>
                               </div>
                            ))
                          )}
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {/* Purchase Bar */}
           <div className="fixed bottom-6 left-4 right-4 z-[60] bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-4 flex items-center gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-24 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] delay-150 fill-mode-both">
              <div className="flex flex-col ml-2">
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.1em] mb-1 leading-none">Стоимость</span>
                 <span className="text-xl font-black text-white leading-none tabular-nums italic-none tracking-tight">{product.price} ₽</span>
              </div>
              <button 
                 onClick={() => setShowCheckout(true)}
                 className="flex-1 h-14 rounded-3xl bg-primary flex items-center justify-center gap-3 text-primary-foreground font-black text-[12px] shadow-lg active:scale-[0.97] transition-all uppercase tracking-widest"
              >
                 <ShoppingBag className="h-5 w-5" />
                 Заказать
              </button>
           </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-8 duration-500 p-6">
           <div className="mb-10 flex items-center gap-4">
              <button onClick={() => setShowCheckout(false)} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 transition-colors">
                 <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tight leading-none italic-none mb-1">Оформление</h2>
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{product.name}</p>
              </div>
           </div>

           <div className="space-y-3 mb-10">
              <div className="group relative">
                 <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30"><User className="h-4 w-4" /></span>
                 <input 
                    type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Имя и Фамилия получателя" 
                    className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 pl-14 pr-6 text-sm font-black placeholder:font-bold placeholder:text-white/20 focus:border-primary outline-none transition-all"
                 />
              </div>
              <div className="group relative">
                 <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30"><Phone className="h-4 w-4" /></span>
                 <input 
                    type="text" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="Номер Телефона" 
                    className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 pl-14 pr-6 text-sm font-black placeholder:font-bold placeholder:text-white/20 focus:border-primary outline-none transition-all"
                 />
              </div>
              <div className="group relative">
                 <span className="absolute left-5 top-7 -translate-y-1/2 text-white/30"><MapPin className="h-4 w-4" /></span>
                 <textarea 
                    value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Адрес (Улица, Дом, Квартира)" 
                    className="w-full min-h-[120px] rounded-[2rem] bg-white/5 border border-white/10 pl-14 pr-6 py-5 text-sm font-black placeholder:font-bold placeholder:text-white/20 focus:border-primary outline-none transition-all"
                 />
              </div>
              <div className="group relative">
                 <input 
                    type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Город / Населенный пункт" 
                    className="w-full h-16 rounded-[2rem] bg-white/5 border border-white/10 px-8 text-sm font-black placeholder:font-bold placeholder:text-white/20 focus:border-primary outline-none transition-all"
                 />
              </div>
           </div>

           <div className="p-6 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 mb-10">
              <div className="flex items-center gap-4 mb-3">
                 <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400"><Truck className="h-5 w-5" /></div>
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic-none">Доставка СДЭК</span>
              </div>
              <p className="text-[10px] text-blue-100/40 leading-relaxed font-bold uppercase tracking-tight">Бесплатная настройка VPN «под ключ» включена в стоимость. Оплата производится после подтверждения заказа менеджером.</p>
           </div>

           <button 
              onClick={handleOrder}
              disabled={isOrdering}
              className="w-full h-16 rounded-[1.5rem] bg-primary shadow-lg flex items-center justify-center gap-3 text-primary-foreground font-black uppercase text-[12px] tracking-widest disabled:opacity-50 active:scale-[0.98] transition-all"
           >
              {isOrdering ? <Loader2 className="animate-spin h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              Подтвердить заказ
           </button>
        </div>
      )}
    </div>
  )
}
