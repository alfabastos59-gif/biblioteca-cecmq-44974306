import gatinhoQuiterioImg from "@/app/assets/images/cat_typing_coffee.jpg";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";

  return (
    <div
      className={`quiterio-agent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={gatinhoQuiterioImg}
        alt="Quitério Mascote - Gatinho digitando e tomando café"
        className={`quiterio-agent-img object-cover ${cls}`}
      />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0;border-radius:9999px;overflow:hidden;background:#ecfdf5}
        .quiterio-agent-img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.15);animation:qa-sway 3s ease-in-out infinite;transform-origin:50% 80%}
        .quiterio-agent-img.is-happy{animation:qa-wiggle 1.6s ease-in-out infinite}
        .quiterio-agent-img.is-talking{animation:qa-pounce .55s ease-in-out infinite}
        @keyframes qa-sway{0%,100%{transform:translateY(0) scale(1.15)}50%{transform:translateY(-2px) scale(1.18)}}
        @keyframes qa-wiggle{0%,100%{transform:rotate(-2deg) scale(1.15)}50%{transform:translateY(-3px) rotate(2deg) scale(1.2)}}
        @keyframes qa-pounce{0%,100%{transform:scale(1.15)}50%{transform:translateY(-4px) scale(1.22)}}
        @media (prefers-reduced-motion:reduce){.quiterio-agent-img{animation:none}}
      `}</style>
    </div>
  );
}
