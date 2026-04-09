export default function Card({ children, className = "" }) {
  return (
    <div
  className={`
    bg-slate-900/70
    backdrop-blur-xl
    border border-slate-800
    rounded-2xl
    p-6
    shadow-[0_0_40px_rgba(59,130,246,0.08)]
    transition-all duration-300
    hover:scale-[1.01]
    hover:shadow-[0_0_60px_rgba(59,130,246,0.15)]
    ${className}
  `}
>
      {children}
    </div>
  );
}