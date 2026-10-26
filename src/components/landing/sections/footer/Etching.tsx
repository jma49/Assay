/** The sign-off etching: the light box with a film of two lit rows, engraved on the room (drawn by footer.motion.ts). */
export function Etching() {
  return (
    <svg className="etch" viewBox="0 20 640 330" fill="none">
      <g className="etch-wall">
        <path
          d="M84 48 l-10 10 M84 72 l-10 10 M84 96 l-10 10 M84 120 l-10 10 M84 144 l-10 10 M84 168 l-10 10 M84 192 l-10 10 M84 216 l-10 10 M84 240 l-10 10 M84 264 l-10 10 M84 288 l-10 10 M84 312 l-10 10"
          className="hatch"
        />
        <path
          d="M566 48 l-10 10 M566 72 l-10 10 M566 96 l-10 10 M566 120 l-10 10 M566 144 l-10 10 M566 168 l-10 10 M566 192 l-10 10 M566 216 l-10 10 M566 240 l-10 10 M566 264 l-10 10 M566 288 l-10 10 M566 312 l-10 10"
          className="hatch"
        />
      </g>
      <g className="etch-box">
        <rect x="112" y="40" width="416" height="284" rx="10" />
        <circle cx="124" cy="52" r="3" />
        <circle cx="516" cy="52" r="3" />
        <circle cx="124" cy="312" r="3" />
        <circle cx="516" cy="312" r="3" />
        <rect x="126" y="62" width="388" height="238" rx="4" />
        <path d="M126 306 H514" />
        <rect x="484" y="310" width="18" height="8" rx="2" />
        <path d="M490 314 h6" />
        <path d="M138 74 H502 M138 74 V288" className="hatch" />
      </g>
      <g className="etch-film">
        <rect x="166" y="70" width="308" height="206" rx="2" />
        <path d="M466 82 a5 5 0 0 1 -10 0" />
        <path d="M182 104 H262 M286 104 H366 M390 104 H458" className="strip" />
        <path
          className="rows"
          d="M182 116 H252 M182 124 H246 M182 132 H256 M182 140 H240 M182 148 H254 M182 156 H248 M182 164 H258 M182 172 H244 M182 180 H252 M182 188 H246 M182 196 H256 M182 204 H242 M182 212 H254 M182 220 H248 M182 228 H252 M182 236 H246 M182 244 H256 M182 252 H244"
        />
        <path
          className="rows"
          d="M286 116 H356 M286 124 H350 M286 132 H360 M286 140 H344 M286 148 H358 M286 156 H352 M286 164 H362 M286 172 H348 M286 180 H356 M286 188 H350 M286 196 H360 M286 204 H346 M286 212 H358 M286 220 H352 M286 228 H356 M286 236 H350 M286 244 H360 M286 252 H348"
        />
        <path
          className="rows"
          d="M390 116 H450 M390 124 H444 M390 132 H454 M390 140 H438 M390 148 H452 M390 156 H446 M390 164 H456 M390 172 H442 M390 180 H450 M390 188 H444 M390 196 H454 M390 204 H440 M390 212 H452 M390 220 H446 M390 228 H450 M390 236 H444 M390 244 H454 M390 252 H442"
        />
      </g>
      <g className="etch-clips">
        <path d="M132 56 H508 M132 66 H508" />
        <path d="M206 56 v14 M238 56 v14 M402 56 v14 M434 56 v14" />
        <path d="M206 70 h32 M402 70 h32" />
      </g>
      <g className="etch-lit">
        <path className="halo" d="M180 116 H262 M388 252 H460" />
        <path className="core" d="M180 116 H262 M388 252 H460" />
      </g>
    </svg>
  );
}
