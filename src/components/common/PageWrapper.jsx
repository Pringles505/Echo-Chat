/**
 * PageWrapper — wrapper base para todas las páginas (excepto LandingPage).
 * Aplica: fondo negro, glow violeta sutil, tipografía Inter, sin overflow horizontal.
 * NO incluye partículas — solo la LandingPage las tiene.
 */
export default function PageWrapper({ children, className = '' }) {
  return (
    <div
      className={`relative min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-violet-500/30 ${className}`}
    >
      {/* Glow de fondo — coherente con landing */}
      <div className='fixed inset-0 pointer-events-none z-0'>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] opacity-50' />
        <div className='absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] opacity-30' />
      </div>

      <div className='relative z-10'>{children}</div>
    </div>
  )
}
