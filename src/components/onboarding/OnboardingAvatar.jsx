export default function OnboardingAvatar({ className = "" }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a person getting ready to personalise their shopping profile"
    >
      <defs>
        <linearGradient id="brBgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE1E9" />
          <stop offset="100%" stopColor="#FFD1DE" />
        </linearGradient>
        <linearGradient id="brTopGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B8F" />
          <stop offset="100%" stopColor="#FF3E6C" />
        </linearGradient>
      </defs>

      {/* Backdrop */}
      <circle cx="160" cy="160" r="150" fill="url(#brBgGrad)" />
      <circle cx="160" cy="160" r="150" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2" />

      {/* Decorative sparkles */}
      <g fill="#FF3E6C" opacity="0.55">
        <path d="M252 78 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" />
        <path d="M64 110 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
      </g>

      {/* Shoulders / top */}
      <path
        d="M92 300 C92 224 120 196 160 196 C200 196 228 224 228 300 Z"
        fill="url(#brTopGrad)"
      />
      {/* Collar */}
      <path d="M138 202 C146 214 174 214 182 202 L172 196 C166 200 154 200 148 196 Z" fill="#FFFFFF" opacity="0.85" />

      {/* Neck */}
      <rect x="145" y="176" width="30" height="30" rx="10" fill="#F3B89A" />

      {/* Head */}
      <ellipse cx="160" cy="146" rx="46" ry="50" fill="#F7C6A3" />

      {/* Hair back */}
      <path
        d="M110 150 C104 108 128 74 160 74 C192 74 216 108 210 150 C210 118 190 100 160 100 C130 100 110 118 110 150 Z"
        fill="#3B2A24"
      />
      {/* Hair sides */}
      <path d="M112 140 C104 168 108 196 122 212 C114 188 112 164 116 142 Z" fill="#3B2A24" />
      <path d="M208 140 C216 168 212 196 198 212 C206 188 208 164 204 142 Z" fill="#3B2A24" />

      {/* Blush */}
      <ellipse cx="134" cy="158" rx="9" ry="6" fill="#FF9EAE" opacity="0.55" />
      <ellipse cx="186" cy="158" rx="9" ry="6" fill="#FF9EAE" opacity="0.55" />

      {/* Eyes (closed, gentle) */}
      <path d="M128 144 Q136 150 144 144" stroke="#3B2A24" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M176 144 Q184 150 192 144" stroke="#3B2A24" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Smile */}
      <path d="M148 168 Q160 178 172 168" stroke="#B5573B" strokeWidth="3.5" fill="none" strokeLinecap="round" />

      {/* Clasped hands near chest */}
      <ellipse cx="160" cy="234" rx="22" ry="16" fill="#F3B89A" />
      <ellipse cx="148" cy="230" rx="12" ry="15" fill="#F7C6A3" />
      <ellipse cx="172" cy="230" rx="12" ry="15" fill="#F7C6A3" />

      {/* Sleeves */}
      <path d="M110 232 C100 218 100 250 118 262 C124 250 122 238 110 232 Z" fill="#FF3E6C" />
      <path d="M210 232 C220 218 220 250 202 262 C196 250 198 238 210 232 Z" fill="#FF3E6C" />
    </svg>
  );
}
