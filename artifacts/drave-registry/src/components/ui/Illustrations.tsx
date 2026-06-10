export function DomainSearchIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="480" height="360" fill="none" />
      {/* Laptop body */}
      <rect x="80" y="60" width="320" height="200" rx="12" fill="#F0F7FF" stroke="#0A91F9" strokeWidth="2.5" />
      {/* Laptop screen */}
      <rect x="96" y="76" width="288" height="168" rx="6" fill="white" stroke="#E2EEF9" strokeWidth="1.5" />
      {/* Browser bar */}
      <rect x="96" y="76" width="288" height="28" rx="6" fill="#EFF7FF" />
      <circle cx="114" cy="90" r="5" fill="#FF6B6B" />
      <circle cx="130" cy="90" r="5" fill="#FFD93D" />
      <circle cx="146" cy="90" r="5" fill="#6BCB77" />
      <rect x="160" y="82" width="180" height="16" rx="8" fill="white" stroke="#D1E8FF" strokeWidth="1" />
      <text x="185" y="93" fontSize="8" fill="#6B7280" fontFamily="sans-serif">draveregistry.com/domains</text>

      {/* Search bar on screen */}
      <rect x="116" y="120" width="248" height="36" rx="18" fill="white" stroke="#0A91F9" strokeWidth="2" />
      <circle cx="138" cy="138" r="8" fill="none" stroke="#0A91F9" strokeWidth="2" />
      <line x1="144" y1="144" x2="148" y2="148" stroke="#0A91F9" strokeWidth="2" strokeLinecap="round" />
      <text x="155" y="142" fontSize="10" fill="#9CA3AF" fontFamily="sans-serif">Find your perfect domain...</text>

      {/* Search results */}
      <rect x="116" y="170" width="248" height="30" rx="6" fill="#F0FFF4" stroke="#86EFAC" strokeWidth="1" />
      <circle cx="134" cy="185" r="6" fill="#22C55E" />
      <text x="122" y="189" fontSize="9" fill="#22C55E" fontFamily="sans-serif" fontWeight="bold">✓</text>
      <text x="148" y="188" fontSize="10" fill="#166534" fontFamily="sans-serif" fontWeight="bold">mybusiness.com</text>
      <text x="298" y="188" fontSize="10" fill="#0A91F9" fontFamily="sans-serif" fontWeight="bold">$12.99</text>
      <rect x="336" y="178" width="20" height="14" rx="4" fill="#0A91F9" />
      <text x="341" y="188" fontSize="8" fill="white" fontFamily="sans-serif" fontWeight="bold">+</text>

      <rect x="116" y="206" width="248" height="30" rx="6" fill="#FFF8F0" stroke="#FED7AA" strokeWidth="1" />
      <text x="148" y="224" fontSize="10" fill="#92400E" fontFamily="sans-serif">mybusiness.net</text>
      <text x="298" y="224" fontSize="10" fill="#0A91F9" fontFamily="sans-serif" fontWeight="bold">$14.99</text>

      {/* Laptop base */}
      <path d="M60 262 Q60 270 80 270 L400 270 Q420 270 420 262 L412 260 H68 Z" fill="#D1E8FF" />
      <rect x="195" y="258" width="90" height="6" rx="3" fill="#A3C4E0" />

      {/* Floating badges */}
      <g transform="translate(380, 90)">
        <rect width="80" height="28" rx="14" fill="#0A91F9" filter="url(#shadow)" />
        <text x="12" y="18" fontSize="10" fill="white" fontFamily="sans-serif" fontWeight="bold">ICANN ✓</text>
      </g>
      <g transform="translate(390, 200)">
        <rect width="70" height="28" rx="14" fill="#22C55E" />
        <text x="10" y="18" fontSize="10" fill="white" fontFamily="sans-serif" fontWeight="bold">SSL 🔒</text>
      </g>
      <g transform="translate(15, 160)">
        <rect width="58" height="28" rx="14" fill="#8B5CF6" />
        <text x="8" y="18" fontSize="9" fill="white" fontFamily="sans-serif" fontWeight="bold">500+ TLDs</text>
      </g>

      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
        </filter>
      </defs>
    </svg>
  );
}

export function EmailIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Background card */}
      <rect x="40" y="30" width="400" height="280" rx="20" fill="#F0F7FF" stroke="#D1E8FF" strokeWidth="2" />

      {/* Email compose window */}
      <rect x="60" y="50" width="360" height="240" rx="12" fill="white" stroke="#E2EEF9" strokeWidth="1.5" />

      {/* Header bar */}
      <rect x="60" y="50" width="360" height="40" rx="12" fill="#0A91F9" />
      <rect x="60" y="70" width="360" height="20" fill="#0A91F9" />
      <text x="80" y="76" fontSize="13" fill="white" fontFamily="sans-serif" fontWeight="bold">New Message</text>
      <circle cx="398" cy="70" r="8" fill="rgba(255,255,255,0.2)" />
      <text x="394" y="74" fontSize="11" fill="white" fontFamily="sans-serif">×</text>

      {/* To field */}
      <rect x="76" y="106" width="328" height="28" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <text x="90" y="124" fontSize="10" fill="#6B7280" fontFamily="sans-serif">To:</text>
      <rect x="108" y="112" width="80" height="16" rx="8" fill="#DBEAFE" />
      <text x="114" y="123" fontSize="9" fill="#1D4ED8" fontFamily="sans-serif">john@mybiz.com</text>

      {/* Subject field */}
      <rect x="76" y="144" width="328" height="28" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <text x="90" y="162" fontSize="10" fill="#6B7280" fontFamily="sans-serif">Subject:</text>
      <text x="140" y="162" fontSize="10" fill="#111827" fontFamily="sans-serif">Welcome to our new office! 🎉</text>

      {/* Body */}
      <text x="90" y="192" fontSize="10" fill="#374151" fontFamily="sans-serif">Hi team,</text>
      <rect x="90" y="200" width="250" height="8" rx="4" fill="#E5E7EB" />
      <rect x="90" y="214" width="200" height="8" rx="4" fill="#E5E7EB" />
      <rect x="90" y="228" width="220" height="8" rx="4" fill="#E5E7EB" />
      <rect x="90" y="242" width="150" height="8" rx="4" fill="#E5E7EB" />

      {/* Send button */}
      <rect x="300" y="262" width="88" height="28" rx="14" fill="#0A91F9" />
      <text x="317" y="280" fontSize="11" fill="white" fontFamily="sans-serif" fontWeight="bold">Send ➤</text>

      {/* Floating email addresses */}
      <g transform="translate(-20, 40)">
        <rect width="140" height="36" rx="10" fill="white" stroke="#E2EEF9" strokeWidth="1.5" filter="url(#eshadow)" />
        <circle cx="18" cy="18" r="10" fill="#0A91F9" />
        <text x="13" y="22" fontSize="11" fill="white" fontFamily="sans-serif" fontWeight="bold">C</text>
        <text x="34" y="14" fontSize="8" fill="#6B7280" fontFamily="sans-serif">CEO</text>
        <text x="34" y="25" fontSize="9" fill="#111827" fontFamily="sans-serif" fontWeight="bold">ceo@mybiz.com</text>
      </g>
      <g transform="translate(360, 280)">
        <rect width="130" height="36" rx="10" fill="white" stroke="#E2EEF9" strokeWidth="1.5" filter="url(#eshadow)" />
        <circle cx="18" cy="18" r="10" fill="#8B5CF6" />
        <text x="13" y="22" fontSize="11" fill="white" fontFamily="sans-serif" fontWeight="bold">S</text>
        <text x="34" y="14" fontSize="8" fill="#6B7280" fontFamily="sans-serif">Sales</text>
        <text x="34" y="25" fontSize="9" fill="#111827" fontFamily="sans-serif" fontWeight="bold">sales@mybiz.com</text>
      </g>

      <defs>
        <filter id="eshadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.1" />
        </filter>
      </defs>
    </svg>
  );
}

export function TransferIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Left box (old registrar) */}
      <rect x="20" y="80" width="130" height="140" rx="14" fill="#FEF9EC" stroke="#FCD34D" strokeWidth="2" />
      <rect x="20" y="80" width="130" height="32" rx="14" fill="#FCD34D" />
      <rect x="20" y="100" width="130" height="12" fill="#FCD34D" />
      <text x="38" y="103" fontSize="11" fill="white" fontFamily="sans-serif" fontWeight="bold">Old Registrar</text>
      <text x="38" y="134" fontSize="9" fill="#92400E" fontFamily="sans-serif">mybusiness.com</text>
      <rect x="36" y="142" width="98" height="6" rx="3" fill="#FDE68A" />
      <rect x="36" y="154" width="75" height="6" rx="3" fill="#FDE68A" />
      <rect x="36" y="166" width="88" height="6" rx="3" fill="#FDE68A" />
      <text x="38" y="198" fontSize="9" fill="#D97706" fontFamily="sans-serif">Expires: 2027-06-15</text>

      {/* Arrow */}
      <g transform="translate(200, 150)">
        <circle r="28" fill="#EFF7FF" stroke="#0A91F9" strokeWidth="2" />
        <path d="M-10 0 L8 0 M4 -6 L12 0 L4 6" stroke="#0A91F9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Right box (Drave) */}
      <rect x="250" y="80" width="130" height="140" rx="14" fill="#EFF7FF" stroke="#0A91F9" strokeWidth="2" />
      <rect x="250" y="80" width="130" height="32" rx="14" fill="#0A91F9" />
      <rect x="250" y="100" width="130" height="12" fill="#0A91F9" />
      <text x="263" y="103" fontSize="11" fill="white" fontFamily="sans-serif" fontWeight="bold">Drave Registry</text>
      <text x="263" y="134" fontSize="9" fill="#1D4ED8" fontFamily="sans-serif">mybusiness.com</text>
      <rect x="263" y="142" width="98" height="6" rx="3" fill="#BFDBFE" />
      <rect x="263" y="154" width="75" height="6" rx="3" fill="#BFDBFE" />
      <rect x="263" y="166" width="88" height="6" rx="3" fill="#BFDBFE" />
      <g transform="translate(263, 188)">
        <circle r="7" fill="#22C55E" />
        <text x="-5" y="4" fontSize="10" fill="white" fontFamily="sans-serif" fontWeight="bold">✓</text>
      </g>
      <text x="276" y="196" fontSize="9" fill="#166534" fontFamily="sans-serif">+1 year FREE</text>

      {/* Free badge */}
      <g transform="translate(310, 58)">
        <rect width="60" height="22" rx="11" fill="#22C55E" />
        <text x="8" y="15" fontSize="9" fill="white" fontFamily="sans-serif" fontWeight="bold">FREE YR</text>
      </g>
    </svg>
  );
}

export function DashboardIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 340" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Browser shell */}
      <rect x="20" y="20" width="440" height="300" rx="14" fill="white" stroke="#E2EEF9" strokeWidth="2" />
      <rect x="20" y="20" width="440" height="36" rx="14" fill="#F3F4F6" />
      <rect x="20" y="44" width="440" height="12" fill="#F3F4F6" />
      <circle cx="42" cy="38" r="6" fill="#FF6B6B" />
      <circle cx="60" cy="38" r="6" fill="#FFD93D" />
      <circle cx="78" cy="38" r="6" fill="#6BCB77" />

      {/* Sidebar */}
      <rect x="20" y="56" width="110" height="264" fill="#0A91F9" />
      <circle cx="75" cy="82" r="18" fill="rgba(255,255,255,0.2)" />
      <text x="68" y="87" fontSize="13" fill="white" fontFamily="sans-serif" fontWeight="bold">JD</text>
      <text x="50" y="106" fontSize="8" fill="rgba(255,255,255,0.8)" fontFamily="sans-serif">John Doe</text>

      {/* Sidebar items */}
      {[
        { y: 128, label: "Dashboard", active: true },
        { y: 152, label: "Domains" },
        { y: 176, label: "Emails" },
        { y: 200, label: "Billing" },
        { y: 224, label: "Profile" },
      ].map(({ y, label, active }) => (
        <g key={label}>
          <rect x="28" y={y - 10} width="94" height="22" rx="6" fill={active ? "rgba(255,255,255,0.25)" : "transparent"} />
          <text x="40" y={y + 5} fontSize="9" fill="white" fontFamily="sans-serif" fontWeight={active ? "bold" : "normal"} opacity={active ? 1 : 0.75}>
            {label}
          </text>
        </g>
      ))}

      {/* Main content */}
      <text x="148" y="80" fontSize="14" fill="#111827" fontFamily="sans-serif" fontWeight="bold">Hello, John!</text>
      <text x="148" y="95" fontSize="8" fill="#6B7280" fontFamily="sans-serif">Last login: Today at 10:30 AM</text>

      {/* Stats row */}
      {[
        { x: 148, color: "#DBEAFE", text: "#1D4ED8", label: "Domains", value: "5" },
        { x: 228, color: "#D1FAE5", text: "#065F46", label: "Emails", value: "23" },
        { x: 308, color: "#FEF3C7", text: "#92400E", label: "Expiring", value: "1" },
        { x: 388, color: "#EDE9FE", text: "#5B21B6", label: "Balance", value: "$25" },
      ].map(({ x, color, text, label, value }) => (
        <g key={label}>
          <rect x={x} y="106" width="68" height="54" rx="10" fill={color} />
          <text x={x + 10} y="124" fontSize="18" fill={text} fontFamily="sans-serif" fontWeight="bold">{value}</text>
          <text x={x + 10} y="148" fontSize="8" fill={text} fontFamily="sans-serif" opacity="0.8">{label}</text>
        </g>
      ))}

      {/* Domain list */}
      <text x="148" y="180" fontSize="10" fill="#111827" fontFamily="sans-serif" fontWeight="bold">Recent Domains</text>
      {[
        { y: 195, name: "mybusiness.com", status: "Active", color: "#22C55E" },
        { y: 215, name: "mystore.net", status: "Active", color: "#22C55E" },
        { y: 235, name: "portfolio.io", status: "Expiring", color: "#F59E0B" },
      ].map(({ y, name, status, color }) => (
        <g key={name}>
          <rect x="148" y={y} width="302" height="18" rx="4" fill="#F9FAFB" />
          <text x="158" y={y + 12} fontSize="9" fill="#111827" fontFamily="sans-serif">{name}</text>
          <circle cx={400} cy={y + 9} r="4" fill={color} />
          <text x={408} y={y + 12} fontSize="8" fill={color} fontFamily="sans-serif">{status}</text>
        </g>
      ))}
    </svg>
  );
}

export function PersonIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Body */}
      <ellipse cx="100" cy="240" rx="50" ry="20" fill="#DBEAFE" />
      {/* Legs */}
      <rect x="82" y="200" width="16" height="50" rx="8" fill="#1D4ED8" />
      <rect x="102" y="200" width="16" height="50" rx="8" fill="#1D4ED8" />
      {/* Shoes */}
      <ellipse cx="90" cy="248" rx="12" ry="6" fill="#111827" />
      <ellipse cx="110" cy="248" rx="12" ry="6" fill="#111827" />
      {/* Torso */}
      <rect x="70" y="130" width="60" height="75" rx="16" fill="#0A91F9" />
      {/* Collar/shirt detail */}
      <path d="M100 130 L88 148 L100 155 L112 148 Z" fill="white" opacity="0.3" />
      {/* Left arm - holding laptop */}
      <path d="M70 150 Q50 160 45 175" stroke="#0A91F9" strokeWidth="18" strokeLinecap="round" fill="none" />
      {/* Right arm - pointing */}
      <path d="M130 145 Q155 135 165 120" stroke="#0A91F9" strokeWidth="18" strokeLinecap="round" fill="none" />
      {/* Hand pointing */}
      <circle cx="167" cy="116" r="10" fill="#FBBF24" />
      {/* Head */}
      <circle cx="100" cy="96" r="35" fill="#FBBF24" />
      {/* Hair */}
      <path d="M68 84 Q78 60 100 62 Q122 60 132 84 Q120 72 100 74 Q80 72 68 84 Z" fill="#1F2937" />
      {/* Eyes */}
      <circle cx="90" cy="96" r="5" fill="white" />
      <circle cx="110" cy="96" r="5" fill="white" />
      <circle cx="91" cy="97" r="3" fill="#1F2937" />
      <circle cx="111" cy="97" r="3" fill="#1F2937" />
      {/* Smile */}
      <path d="M88 110 Q100 120 112 110" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Laptop in left hand */}
      <rect x="24" y="165" width="42" height="30" rx="4" fill="#1D4ED8" />
      <rect x="27" y="168" width="36" height="24" rx="2" fill="#60A5FA" />
      <rect x="30" y="171" width="30" height="3" rx="1.5" fill="white" opacity="0.6" />
      <rect x="30" y="177" width="20" height="3" rx="1.5" fill="white" opacity="0.4" />
      <rect x="30" y="183" width="25" height="3" rx="1.5" fill="white" opacity="0.4" />
      <rect x="18" y="195" width="54" height="4" rx="2" fill="#93C5FD" />
    </svg>
  );
}

export function GlobeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="80" fill="#EFF7FF" stroke="#BFDBFE" strokeWidth="2" />
      <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />
      <ellipse cx="100" cy="100" rx="55" ry="80" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />
      <line x1="20" y1="100" x2="180" y2="100" stroke="#BFDBFE" strokeWidth="1.5" />
      <line x1="30" y1="65" x2="170" y2="65" stroke="#BFDBFE" strokeWidth="1.5" />
      <line x1="30" y1="135" x2="170" y2="135" stroke="#BFDBFE" strokeWidth="1.5" />
      {/* Continents */}
      <path d="M85 55 Q100 45 115 55 Q125 65 120 80 Q115 90 100 88 Q85 88 80 80 Q75 68 85 55Z" fill="#0A91F9" opacity="0.6" />
      <path d="M60 90 Q75 85 80 98 Q78 112 65 114 Q52 112 50 100 Q50 90 60 90Z" fill="#0A91F9" opacity="0.5" />
      <path d="M110 105 Q125 100 135 112 Q138 125 128 132 Q115 136 105 128 Q98 118 110 105Z" fill="#0A91F9" opacity="0.5" />
      {/* Pin */}
      <circle cx="132" cy="68" r="10" fill="#0A91F9" />
      <circle cx="132" cy="68" r="5" fill="white" />
      <line x1="132" y1="78" x2="132" y2="92" stroke="#0A91F9" strokeWidth="2" strokeLinecap="round" />
      {/* Orbit ring */}
      <ellipse cx="100" cy="100" rx="96" ry="30" fill="none" stroke="#0A91F9" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
      {/* Satellite dot */}
      <circle cx="100" cy="70" r="6" fill="#0A91F9" />
    </svg>
  );
}
