import quiterioVideo from "@/assets/quiterio-agente.mp4.asset.json";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";
  return (
    <div className={`quiterio-agent ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <video src={quiterioVideo.url} autoPlay loop muted playsInline className={`quiterio-agent-video ${cls}`} />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0;border-radius:9999px;overflow:hidden;background:#ecfdf5}
        .quiterio-agent-video{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.35);animation:qa-sway 3s ease-in-out infinite;transform-origin:50% 85%}
        .quiterio-agent-video.is-happy{animation:qa-wiggle 1.6s ease-in-out infinite}
        .quiterio-agent-video.is-talking{animation:qa-pounce .55s ease-in-out infinite}
        @keyframes qa-sway{0%,100%{transform:translateY(0) scale(1.35)}50%{transform:translateY(-1px) scale(1.38)}}
        @keyframes qa-wiggle{0%,100%{transform:rotate(-2deg) scale(1.35)}50%{transform:translateY(-2px) rotate(2deg) scale(1.4)}}
        @keyframes qa-pounce{0%,100%{transform:scale(1.35)}50%{transform:translateY(-3px) scale(1.42)}}
        @media (prefers-reduced-motion:reduce){.quiterio-agent-video{animation:none}}
      `}</style>
    </div>
  );
}
