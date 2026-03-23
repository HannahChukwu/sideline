import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

export default function Home() {
  return (
    <div className='relative min-h-screen bg-background overflow-hidden flex flex-col'>
      <div className='absolute inset-0 bg-dots opacity-100' />
      <div className='absolute inset-0 bg-speed-lines' />
      <div className='absolute top-[-80px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[180px] pointer-events-none' />
      <div className='absolute bottom-[-60px] left-[-60px] w-[420px] h-[420px] bg-primary/6 rounded-full blur-[140px] pointer-events-none' />

      <header className='relative z-20 flex items-center justify-between px-8 py-5'>
        <Logo size='sm' />
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/8'>
            <span className='relative flex h-1.5 w-1.5'>
              <span className='live-dot animate-pulse absolute inline-flex h-full w-full rounded-full bg-primary opacity-75' />
              <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-primary' />
            </span>
            <span className='text-[10px] font-bold text-primary tracking-widest uppercase'>Live</span>
          </div>
        </div>
      </header>

      <main className='relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-8'>
        <div className='mb-8 animate-fade-up'>
          <div className='w-16 h-16 rounded-2xl bg-primary flex items-center justify-center glow-violet animate-pulse-glow'>
            <svg width='34' height='34' viewBox='0 0 28 28' fill='none' aria-hidden='true'>
              <rect x='4' y='3' width='3.5' height='22' rx='1.75' fill='white' />
              <rect x='10' y='8.5' width='14' height='3' rx='1.5' fill='white' />
              <rect x='10' y='14' width='9' height='2' rx='1' fill='white' opacity='0.5' />
              <rect x='10' y='18.5' width='5' height='1.5' rx='0.75' fill='white' opacity='0.22' />
            </svg>
          </div>
        </div>

        <div className='text-center mb-3 animate-fade-up animate-delay-100'>
          <h1 className='text-[clamp(64px,13vw,148px)] font-black leading-[0.88] tracking-[-0.05em]'>
            <span className='text-gradient'>SIDELINE</span>
          </h1>
          <div className='flex items-center justify-center gap-5 mt-4'>
            <div className='h-px w-20 bg-gradient-to-r from-transparent to-border' />
            <span className='text-[11px] font-bold tracking-[0.5em] uppercase text-muted-foreground'>Studio</span>
            <div className='h-px w-20 bg-gradient-to-l from-transparent to-border' />
          </div>
        </div>

        <p className='text-foreground/45 text-[15px] font-semibold text-center max-w-xs mb-10 leading-relaxed animate-fade-up animate-delay-200'>
          Game day assets in seconds.<br />Built for teams that move fast.
        </p>

        <div className='flex items-center gap-3 mb-14 animate-fade-up animate-delay-250'>
          <Link href='/auth?mode=signup' className='btn-shimmer glow-violet-btn relative inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold tracking-tight transition-all duration-200'>
            Get Started
            <ArrowRight className='w-4 h-4' />
          </Link>
          <Link href='/auth?mode=login' className='inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-border bg-white/[0.04] text-foreground/80 text-sm font-bold tracking-tight hover:bg-white/[0.07] hover:text-foreground hover:border-primary/30 transition-all duration-200'>
            Sign In
          </Link>
        </div>

        <div className='mt-12 flex items-center gap-10 animate-fade-up animate-delay-400'>
          {[{value:'< 30s',label:'To generate'},{value:'3',label:'Portals'},{value:'AI',label:'Powered'}].map((s) => (
            <div key={s.label} className='flex flex-col items-center gap-0.5'>
              <span className='text-base font-black text-foreground/75 tracking-tight'>{s.value}</span>
              <span className='text-[9px] font-bold tracking-widest uppercase text-foreground/22'>{s.label}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className='relative z-10 pb-6 flex justify-center'>
        <span className='text-[10px] font-semibold text-foreground/18 tracking-wide'>© 2026 Sideline Studio · Built for athletes</span>
      </footer>
    </div>
  );
}
