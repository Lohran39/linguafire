export function StudyArtwork({ scene }: { scene: string }) {
  return <svg className="study-artwork" viewBox="0 0 240 120" fill="none" aria-hidden="true">
    <rect width="240" height="120" rx="12" fill="currentColor" opacity=".06" />
    <circle cx="192" cy="30" r="35" fill="currentColor" opacity=".07" />
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {scene === 'restaurant' ? <><path d="M30 89h180M61 92v17M179 92v17" /><ellipse cx="130" cy="76" rx="34" ry="8" /><path d="M109 74a21 21 0 0 1 42 0M130 49v-5M62 53h22v23H62zM84 57h5a7 7 0 0 1 0 14h-5M66 40c-6-9 7-9 1-18" /></>
        : scene === 'airport' ? <><rect x="28" y="69" width="34" height="35" rx="5" /><path d="M38 69V58h14v11M36 108h1M54 108h1M99 71l42-18 16-27 9 3-8 23 37 3 12 8-52 4-27 27-8-3 18-24-32 12zM89 104h116" /></>
        : scene === 'job_interview' ? <><rect x="67" y="32" width="106" height="61" rx="5" /><path d="M51 99h138M84 49h46M84 60h70M84 71h38" /><circle cx="188" cy="40" r="17" /><path d="m180 40 6 6 10-12" /></>
        : scene === 'lessons' ? <path d="M120 35c-20-12-48-10-65-5v65c19-6 44-6 65 5 21-11 46-11 65-5V30c-17-5-45-7-65 5v65M70 47h30M70 59h30M140 47h28M140 59h28" />
        : <><path d="M42 28h101v49H80L59 95V77H42zM155 47h40v48h-13l-1 14-19-14h-44V84M60 45h62M60 59h41" /></>}
    </g>
  </svg>;
}

export function FireMark() {
  return <svg className="fire-mark" viewBox="0 0 32 40" fill="currentColor" aria-hidden="true"><path d="M18 1c3 11-7 13-5 21 3-1 5-4 6-7 7 5 11 10 9 16-2 7-8 9-13 8C3 37 0 27 5 19c0 5 2 7 4 7C5 15 18 12 18 1Z" /></svg>;
}
