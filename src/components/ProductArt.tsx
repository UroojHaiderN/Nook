/**
 * Stylised product illustrations. Nothing here is a photo — each piece is drawn
 * so the grid keeps one visual voice no matter what the user types in.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { cachedProductIcon, resolveProductIcon } from '../producticons'

type Props = { art: string; title?: string; className?: string }

const Shadow = () => <ellipse cx="36" cy="92" rx="20" ry="4" fill="rgba(17,17,19,0.12)" />

const shapes: Record<string, ReactElement> = {
  bottle: (
    <>
      <Shadow />
      <path
        d="M30 12h12v10c0 3 6 7 6 14v42a6 6 0 01-6 6H30a6 6 0 01-6-6V36c0-7 6-11 6-14V12z"
        fill="#F7D7E2"
      />
      <path d="M30 12h6v10c0 3-6 7-6 14v52h-6V36c0-7 6-11 6-14V12z" fill="#FBE9F0" />
      <rect x="28.5" y="6" width="15" height="8" rx="2.5" fill="#D98BA9" />
      <rect x="24" y="44" width="24" height="26" rx="3" fill="#FFF6FA" />
      <g fill="#D4739B">
        <rect x="28" y="50" width="16" height="3" rx="1.5" />
        <rect x="28" y="56" width="11" height="2.4" rx="1.2" />
        <rect x="28" y="61" width="13" height="2.4" rx="1.2" />
      </g>
    </>
  ),
  can: (
    <>
      <Shadow />
      <rect x="22" y="10" width="28" height="80" rx="9" fill="#1D1F22" />
      <rect x="22" y="10" width="9" height="80" rx="9" fill="#34383D" />
      <rect x="24" y="8" width="24" height="7" rx="3.5" fill="#B9BDC2" />
      <path d="M36 24l-6 22h5l-4 22 14-26h-6l5-18z" fill="#66E08A" />
      <rect x="27" y="74" width="18" height="3" rx="1.5" fill="#66E08A" opacity="0.7" />
    </>
  ),
  tin: (
    <>
      <Shadow />
      <rect x="20" y="20" width="32" height="70" rx="8" fill="#D8352F" />
      <rect x="20" y="20" width="10" height="70" rx="8" fill="#E8564F" />
      <rect x="23" y="12" width="26" height="12" rx="5" fill="#B62A25" />
      <rect x="20" y="42" width="32" height="24" fill="#FBEFE2" />
      <g fill="#B62A25">
        <rect x="25" y="48" width="22" height="4" rx="2" />
        <rect x="25" y="55" width="14" height="3" rx="1.5" />
      </g>
    </>
  ),
  bar: (
    <>
      <Shadow />
      <rect x="22" y="14" width="28" height="76" rx="6" fill="#6B3FA0" />
      <rect x="22" y="14" width="9" height="76" rx="6" fill="#8556C4" />
      <path d="M22 60h28v10H22z" fill="#F0E4FB" opacity="0.28" />
      <g fill="#F5E9C8">
        <rect x="27" y="28" width="18" height="5" rx="2.5" />
        <rect x="27" y="37" width="12" height="3.4" rx="1.7" />
      </g>
      <path d="M26 74l8 6 8-6" stroke="#4E2C77" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  tub: (
    <>
      <Shadow />
      <path d="M22 30h28l-3 54a6 6 0 01-6 5.6H31a6 6 0 01-6-5.6L22 30z" fill="#F3F5F8" />
      <path d="M22 30h9l-2 59h-1a6 6 0 01-6-5.6L22 30z" fill="#FFFFFF" />
      <rect x="18" y="22" width="36" height="11" rx="5" fill="#CFE3F5" />
      <g fill="#7FAFD8">
        <rect x="28" y="46" width="17" height="4.4" rx="2.2" />
        <rect x="28" y="54" width="11" height="3.2" rx="1.6" />
      </g>
    </>
  ),
  berries: (
    <>
      <Shadow />
      <g fill="#4F63C4">
        <circle cx="27" cy="62" r="13" />
        <circle cx="46" cy="66" r="11" />
        <circle cx="37" cy="46" r="12" />
      </g>
      <g fill="#7185DA">
        <circle cx="23" cy="57" r="4.4" />
        <circle cx="33" cy="41" r="4" />
        <circle cx="43" cy="62" r="3.6" />
      </g>
      <path d="M37 34c2-6 7-9 12-9-1 6-5 10-12 10z" fill="#5FB06B" />
    </>
  ),
  box: (
    <>
      <Shadow />
      <path d="M18 30l18-8 18 8v50l-18 8-18-8V30z" fill="#F1E7DA" />
      <path d="M18 30l18 8v50l-18-8V30z" fill="#E3D5C2" />
      <path d="M36 22l18 8-18 8-18-8 18-8z" fill="#FAF3E9" />
      <rect x="24" y="48" width="18" height="16" rx="3" fill="#C9B69C" opacity="0.65" />
    </>
  ),
  bag: (
    <>
      <Shadow />
      <path d="M22 32h28l3 50a7 7 0 01-7 7.6H26a7 7 0 01-7-7.6l3-50z" fill="#EDEFF2" />
      <path d="M22 32h9l-3 57.6h-2a7 7 0 01-7-7.6l3-50z" fill="#FAFBFC" />
      <path
        d="M28 32v-6a8 8 0 0116 0v6"
        stroke="#B9BFC8"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="28" y="50" width="17" height="4.4" rx="2.2" fill="#AEB6C0" />
    </>
  ),
}

/** A real product icon when one can be found, the drawing until then. */
function useProductIcon(title?: string) {
  const [src, setSrc] = useState<string | null>(() => (title ? cachedProductIcon(title) : null))

  useEffect(() => {
    if (!title) return
    let alive = true
    void resolveProductIcon(title).then((url) => alive && url && setSrc(url))
    return () => {
      alive = false
    }
  }, [title])

  return src
}

export default function ProductArt({ art, title, className }: Props) {
  const icon = useProductIcon(title)

  if (icon)
    return (
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className={`${className ?? ''} animate-fade-in object-contain`}
      />
    )

  return (
    <svg viewBox="0 0 72 100" className={className} aria-hidden="true">
      {shapes[art] ?? shapes.bag}
    </svg>
  )
}
