import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import celvisLogo from "./assets/celvis-logo-transparent.png?url"

type View = "home" | "help" | "model" | "options" | "summary" | "pin" | "admin"
type ServiceId =
  | "screen"
  | "display"
  | "battery"
  | "charging"
  | "back"
  | "faceid"
  | "microsolder"
  | "sim"
  | "other"
type OptionId = "incell" | "oled"

type Model = {
  id: string
  family: string
  name: string
  subtitle: string
  services: ServiceId[]
  serviceLabels: Partial<Record<ServiceId, string>>
  screenOptions: OptionId[]
  photo?: string
}

type StoreConfig = {
  prices: Record<string, string>
  promoPrices: Record<string, string>
  promoActive: Record<string, boolean>
  enabled: Record<string, boolean>
  priceModes: Record<string, "fixed" | "from">
  notes: Record<string, string>
}

type PriceRow = {
  id: number
  model: string
  service: string
  amount: number | null
  price_mode: "fixed" | "from" | "quote"
  note: string
  enabled: boolean
  sort_order: number
}

type Promotion = {
  name: string
  enabled: boolean
  discount_type: "percent" | "fixed"
  value: number
  models: string[]
  services: string[]
  starts_at: string | null
  ends_at: string | null
}

declare global {
  interface Window {
    CelvisAPI?: {
      configured: () => boolean
      publicPrices: () => Promise<PriceRow[]>
      publicPromotion: () => Promise<Promotion | null>
    }
    CelvisPromotions?: {
      discount: (row: PriceRow, promotion: Promotion | null) => PriceRow | null
    }
  }
}

const SERVICES: Record<ServiceId, {
  title: string
  description: string
  code: string
}> = {
  screen: {
    title: "Pantalla rota",
    description: "Si está agrietada, no responde o no muestra imagen.",
    code: "01",
  },
  battery: {
    title: "La batería dura poco",
    description: "Si se descarga rápido o el equipo se apaga.",
    code: "02",
  },
  charging: {
    title: "No carga",
    description: "Puede tener varias causas. Primero requiere un diagnóstico.",
    code: "03",
  },
  display: {
    title: "Pantalla",
    description: "Consulta el reemplazo disponible para este equipo.",
    code: "03",
  },
  back: {
    title: "Cristal trasero roto",
    description: "Si la parte de atrás está quebrada o desprendida.",
    code: "04",
  },
  faceid: {
    title: "Face ID",
    description: "Requiere evaluación antes de confirmar la reparación.",
    code: "05",
  },
  microsolder: {
    title: "Microsoldadura",
    description: "Diagnóstico para fallas internas de la placa.",
    code: "06",
  },
  sim: {
    title: "Conversión SIM física",
    description: "Consulta disponibilidad y condiciones para este equipo.",
    code: "07",
  },
  other: {
    title: "Otro problema",
    description: "Cuéntanos qué sucede y te ayudamos a identificarlo.",
    code: "08",
  },
}

const OPTIONS: Record<OptionId, {
  label: string
  technical: string
  benefit: string
  detail: string
}> = {
  incell: {
    label: "Pantalla económica",
    technical: "Incell",
    benefit: "Opción de reemplazo con tecnología Incell.",
    detail:
      "Pantalla con tecnología Incell. Antes de reparar se confirman disponibilidad, precio y lo que incluye el servicio.",
  },
  oled: {
    label: "Pantalla OLED flexible",
    technical: "Soft OLED",
    benefit: "Opción de reemplazo con tecnología Soft OLED.",
    detail:
      "Pantalla con tecnología Soft OLED. Antes de reparar se confirman disponibilidad, precio y lo que incluye el servicio.",
  },
}

const DATA_SOURCE = import.meta.env.DEV
  ? "https://celvis-pagos.vercel.app"
  : window.location.origin
const WHATSAPP_NUMBER = "18099319939"
const MODEL_PHOTOS: Record<string, string> = {
  "iPhone XR": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-xr/identify-iphone-xr-colors.jpg",
  "iPhone 11": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11-colors.jpg",
  "iPhone 11 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro.jpg",
  "iPhone 11 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/identify-iphone-11pro-max.jpg",
  "iPhone 12": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-colors.png",
  "iPhone 12 Mini": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2021-iphone12-mini-colors.png",
  "iPhone 12 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro/iphone12-pro-colors.jpg",
  "iPhone 12 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-12-pro-max/iphone12-pro-max-colors.jpg",
  "iPhone 13": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-colors.png",
  "iPhone 13 Mini": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-iphone13-mini-colors.png",
  "iPhone 13 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-colors.png",
  "iPhone 13 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/2022-spring-iphone13-pro-max-colors.png",
  "iPhone 14": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-colors-spring-2023.png",
  "iPhone 14 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-plus-colors-spring-2023.png",
  "iPhone 14 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-colors.png",
  "iPhone 14 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-14-pro-max-colors.png",
  "iPhone 15": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15.png",
  "iPhone 15 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-plus.png",
  "iPhone 15 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro.png",
  "iPhone 15 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/fall-2023-iphone-colors-iphone-15-pro-max.png",
  "iPhone 16": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-colors.png",
  "iPhone 16 Plus": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-plus-colors.png",
  "iPhone 16 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-colors.png",
  "iPhone 16 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-16-pro-max-colors.png",
  "iPhone 17": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-colors.png",
  "iPhone 17 Air": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-air-colors.png",
  "iPhone 17 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-pro-colors.png",
  "iPhone 17 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-17-pro-max-colors.png",
  "iPhone 18 Pro": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-18-pro-colors.png",
  "iPhone 18 Pro Max": "https://cdsassets.apple.com/live/7WUAS350/images/iphone/iphone-18-pro-max-colors.png",
}

function loadExternalScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-celvis-source="${src}"]`,
    )
    if (existing) {
      if (existing.dataset.loaded === "true") resolve()
      else existing.addEventListener("load", () => resolve(), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.dataset.celvisSource = src
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true"
        resolve()
      },
      { once: true },
    )
    script.addEventListener(
      "error",
      () => {
        script.remove()
        reject(new Error("script"))
      },
      { once: true },
    )
    document.head.appendChild(script)
  })
}

function modelId(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function serviceId(name: string): ServiceId {
  const normalized = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  if (normalized.includes("pantalla incell") || normalized.includes("soft oled"))
    return "screen"
  if (normalized === "pantalla") return "display"
  if (normalized.includes("bateria")) return "battery"
  if (normalized.includes("tapa trasera")) return "back"
  if (normalized.includes("face id")) return "faceid"
  if (normalized.includes("microsoldadura")) return "microsolder"
  if (normalized.includes("conversion sim")) return "sim"
  return "other"
}

function optionId(name: string): OptionId | null {
  const normalized = name.toLowerCase()
  if (normalized.includes("incell")) return "incell"
  if (normalized.includes("soft oled")) return "oled"
  return null
}

function clientServiceTitle(model: Model, service: ServiceId) {
  if (service === "screen" || service === "battery" || service === "charging") {
    return SERVICES[service].title
  }
  return model.serviceLabels[service] ?? SERVICES[service].title
}

function repairServiceTitle(model: Model, service: ServiceId) {
  if (service === "screen" || service === "display") return "Cambio de pantalla"
  if (service === "battery") {
    return model.serviceLabels.battery?.toLowerCase().includes("premium")
      ? "Cambio de batería Premium"
      : "Cambio de batería"
  }
  if (service === "charging") return "Diagnóstico de carga"
  if (service === "back") return "Cambio de tapa trasera"
  if (service === "faceid") return "Reparación de Face ID"
  if (service === "other") return "Diagnóstico"
  return model.serviceLabels[service] ?? SERVICES[service].title
}

function serviceActionLabel(model: Model, service: ServiceId) {
  if (service === "screen" || service === "display")
    return "Elegir reparación de pantalla"
  if (service === "battery") return "Elegir cambio de batería"
  if (service === "charging" || service === "faceid" || service === "microsolder")
    return "Elegir diagnóstico"
  return `Elegir ${clientServiceTitle(model, service).toLocaleLowerCase()}`
}

function Icon({
  name,
  size = 20,
}: {
  name: "search" | "arrow" | "back" | "check" | "tools" | "close" | "eye"
  size?: number
}) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    back: (
      <>
        <path d="M19 12H5" />
        <path d="m10 17-5-5 5-5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 7" />,
    tools: (
      <>
        <path d="M14.5 6.5 17.5 3a5 5 0 0 1-6 6L4 16.5 7.5 20l7.5-7.5a5 5 0 0 0 6-6L17.5 10Z" />
        <path d="m5 5 14 14" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function ServiceGlyph({ service }: { service: ServiceId }) {
  const paths: Record<ServiceId, ReactNode> = {
    screen: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M10 17h4" />
      </>
    ),
    display: (
      <>
        <rect x="4" y="5" width="16" height="12" rx="2" />
        <path d="M9 21h6M12 17v4" />
      </>
    ),
    battery: (
      <>
        <rect x="5" y="7" width="14" height="11" rx="2" />
        <path d="M9 4h6M9 11h6M12 8v6" />
      </>
    ),
    charging: <path d="m13 2-6 11h5l-1 9 6-12h-5l1-8Z" />,
    back: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <circle cx="10" cy="7" r="1.5" />
        <path d="m8 17 3-4 2 2 3-4" />
      </>
    ),
    faceid: (
      <>
        <path d="M8 4H5v3M16 4h3v3M8 20H5v-3M16 20h3v-3" />
        <path d="M9 10v1M15 10v1M9 15c1.5 1 4.5 1 6 0" />
      </>
    ),
    microsolder: (
      <>
        <path d="M4 7h8v8H4zM12 9h4l4-4M12 13h4l4 4" />
        <path d="M7 4V2M7 20v-2" />
      </>
    ),
    sim: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <rect x="10" y="11" width="5" height="6" rx="1" />
      </>
    ),
    other: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.7 9a2.5 2.5 0 0 1 4.8 1c0 2-2.5 2-2.5 4M12 18h.01" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[service]}
    </svg>
  )
}

function Logo() {
  return (
    <div className="brand" aria-label="Celvis Reparaciones">
      <img className="brand-symbol" src={celvisLogo} alt="" />
      <span className="brand-copy">
        <b>Celvis</b>
        <small>REPARACIONES</small>
      </span>
    </div>
  )
}

function WelcomeIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    try {
      sessionStorage.setItem("celvis-welcome-seen", "true")
    } catch {
      // The animation still works when session storage is unavailable.
    }

    const timeout = window.setTimeout(onComplete, 820)
    return () => window.clearTimeout(timeout)
  }, [onComplete])

  return (
    <button
      className="welcome-intro"
      onPointerDown={onComplete}
      aria-label="Omitir animación de bienvenida"
    >
      <span className="welcome-panel welcome-panel-left" />
      <span className="welcome-panel welcome-panel-right" />
      <img src={celvisLogo} alt="Celvis" />
      <span className="sr-only">Toca para continuar</span>
    </button>
  )
}

function Header({
  onHome,
  onAdmin,
  query,
  onQueryChange,
  admin = false,
}: {
  onHome: () => void
  onAdmin: () => void
  query?: string
  onQueryChange?: (value: string) => void
  admin?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="site-header">
      <button
        className="logo-button"
        onClick={onHome}
        aria-label="Ir al inicio"
      >
        <Logo />
      </button>
      <span className="brand-tagline">
        Diagnóstico y reparación sin complicaciones
      </span>
      {!admin && onQueryChange && (
        <label className="header-search">
          <span>Buscar modelo</span>
          <span className="header-search-control">
            <Icon name="search" size={18} />
            <input
              value={query ?? ""}
              onFocus={onHome}
              onChange={(event) => {
                onHome()
                onQueryChange(event.target.value)
              }}
              placeholder="Ej.: iPhone 13"
            />
          </span>
        </label>
      )}
      <div className="header-actions">
        {admin && <span className="demo-badge">Modo demostración</span>}
        {admin ? (
          <button className="quiet-button" onClick={onAdmin}>
            Salir de tienda
          </button>
        ) : (
          <div className="header-menu">
            <button
              className="menu-trigger"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
            {menuOpen && (
              <div className="menu-popover">
                <span>Opciones</span>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onAdmin()
                  }}
                >
                  <span>
                    <b>Acceso tienda</b>
                    <small>Personal autorizado</small>
                  </span>
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function HomeHeader({ onHelp }: { onHelp: () => void }) {
  return (
    <header className="home-header">
      <button className="logo-button" aria-label="Inicio de Celvis">
        <Logo />
      </button>
      <button className="home-help-button" onClick={onHelp}>
        Ayuda
      </button>
    </header>
  )
}

function Progress({ step }: { step: number }) {
  const labels = ["Tu equipo", "Qué le pasa", "Tu consulta"]
  return (
    <div className="progress repair-thread" aria-label={`Paso ${step} de 3`}>
      <div className="repair-track" aria-hidden="true">
        {[1, 2, 3].map((item) => (
          <span
            key={item}
            className={`${item < step ? "complete" : ""} ${
              item === step ? "current" : ""
            }`}
          />
        ))}
      </div>
      <div className="repair-thread-status" aria-current="step">
        <span className="repair-active-dot" aria-hidden="true" />
        <span>
          Paso {step} de 3 · {labels[step - 1]}
        </span>
      </div>
    </div>
  )
}

function DeviceThumbnail({ model }: { model: Model }) {
  const samsung = model.id.startsWith("galaxy")
  const diagonalCameras = model.id === "iphone-13"

  return (
    <figure className="device-thumbnail">
      {model.photo ? (
        <img
          src={model.photo}
          alt={`Vista de referencia del ${model.name}`}
        />
      ) : (
        <svg
          viewBox="0 0 120 160"
          role="img"
          aria-label={`Vista del ${model.name}`}
        >
        <rect x="25" y="8" width="70" height="144" rx="13" />
        <rect
          className="device-back"
          x="29"
          y="12"
          width="62"
          height="136"
          rx="10"
        />
        {samsung ? (
          <>
            <circle cx="42" cy="29" r="6" />
            <circle cx="42" cy="46" r="6" />
            <circle cx="42" cy="63" r="6" />
            <circle className="device-flash" cx="56" cy="37" r="2.5" />
          </>
        ) : (
          <>
            <rect
              className="camera-block"
              x="34"
              y="18"
              width="34"
              height="34"
              rx="8"
            />
            <circle
              cx={diagonalCameras ? "57" : "44"}
              cy={diagonalCameras ? "41" : "41"}
              r="7"
            />
            <circle
              cx={diagonalCameras ? "44" : "56"}
              cy={diagonalCameras ? "28" : "28"}
              r="7"
            />
            <circle className="device-flash" cx="58" cy="27" r="2.5" />
          </>
        )}
        </svg>
      )}
    </figure>
  )
}

function Price({
  config,
  itemKey,
  compact = false,
  emptyLabel = "Consultar precio",
}: {
  config: StoreConfig
  itemKey: string
  compact?: boolean
  emptyLabel?: string
}) {
  const current = config.prices[itemKey]?.trim()
  const promo = config.promoPrices[itemKey]?.trim()
  const active = config.promoActive[itemKey] && current && promo
  const prefix = config.priceModes[itemKey] === "from" ? "Desde RD$ " : "RD$ "
  const regularAmount = Number(current?.replace(/,/g, ""))
  const promoAmount = Number(promo?.replace(/,/g, ""))
  const savings =
    active &&
    Number.isFinite(regularAmount) &&
    Number.isFinite(promoAmount) &&
    regularAmount > promoAmount
      ? (regularAmount - promoAmount).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })
      : null
  if (!current)
    return (
      <span className={compact ? "price compact" : "price"}>
        {emptyLabel}
      </span>
    )
  return (
    <span className={compact ? "price compact" : "price"}>
      {active && <del>{prefix}{current}</del>}
      <b>{prefix}{active ? promo : current}</b>
      {savings && <small>Ahorras RD${savings}</small>}
    </span>
  )
}

function RepairTerms({
  config,
  itemKey,
}: {
  config: StoreConfig
  itemKey: string
}) {
  const note = config.notes[itemKey]?.trim()
  const confirmed =
    note && /(garant|instalaci[oó]n|incluid[ao])/i.test(note)
  return (
    <span className="repair-terms">
      {confirmed
        ? note
        : "Te confirmamos qué incluye y la garantía por WhatsApp"}
    </span>
  )
}

function App() {
  const [showWelcome, setShowWelcome] = useState(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false
    }

    try {
      return sessionStorage.getItem("celvis-welcome-seen") !== "true"
    } catch {
      return true
    }
  })
  const [view, setView] = useState<View>("home")
  const [returnView, setReturnView] = useState<View>("home")
  const [query, setQuery] = useState("")
  const [pendingModelId, setPendingModelId] = useState<string | null>(null)
  const selectionTimer = useRef<number | null>(null)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  )
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [selectedService, setSelectedService] = useState<ServiceId | null>(null)
  const [selectedOption, setSelectedOption] = useState<OptionId | null>(null)
  const [expandedOption, setExpandedOption] = useState<OptionId | null>(null)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState("")
  const [config, setConfig] = useState<StoreConfig>({
    prices: {},
    promoPrices: {},
    promoActive: {},
    enabled: {},
    priceModes: {},
    notes: {},
  })

  useEffect(
    () => () => {
      if (selectionTimer.current) window.clearTimeout(selectionTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (view !== "options" && view !== "summary") return
    const timeout = window.setTimeout(() => stepHeadingRef.current?.focus(), 0)
    return () => window.clearTimeout(timeout)
  }, [view])

  useEffect(() => {
    let active = true

    async function refreshCatalog() {
      try {
        await loadExternalScript(`${DATA_SOURCE}/config.js`)
        await loadExternalScript(`${DATA_SOURCE}/promotions.js`)
        await loadExternalScript(`${DATA_SOURCE}/catalog-api.js`)
        const api = window.CelvisAPI
        if (!api?.configured()) throw new Error("catalog")

        const [rows, promotion] = await Promise.all([
          api.publicPrices(),
          api.publicPromotion(),
        ])
        if (!active) return

        const grouped = new Map<string, Model>()
        const nextConfig: StoreConfig = {
          prices: {},
          promoPrices: {},
          promoActive: {},
          enabled: {},
          priceModes: {},
          notes: {},
        }

        rows.forEach((row) => {
          const id = modelId(row.model)
          if (!grouped.has(row.model)) {
            grouped.set(row.model, {
              id,
              family: "Apple · iPhone",
              name: row.model,
              subtitle: "Catálogo Celvis",
              services: [],
              serviceLabels: {},
              screenOptions: [],
              photo: MODEL_PHOTOS[row.model],
            })
          }
          const model = grouped.get(row.model)!
          const service = serviceId(row.service)
          const option = optionId(row.service)
          if (!model.services.includes(service)) model.services.push(service)
          model.serviceLabels[service] = row.service
          if (service === "screen" && option && !model.screenOptions.includes(option)) {
            model.screenOptions.push(option)
          }

          const key = `${id}-${service}${option ? `-${option}` : ""}`
          nextConfig.enabled[`${id}-${service}`] = true
          nextConfig.notes[key] = row.note ?? ""
          if (row.amount !== null && row.price_mode !== "quote") {
            nextConfig.prices[key] = Number(row.amount).toLocaleString("en-US", {
              maximumFractionDigits: 2,
            })
            nextConfig.priceModes[key] =
              row.price_mode === "from" ? "from" : "fixed"
            const discounted = window.CelvisPromotions?.discount(row, promotion)
            if (discounted?.amount !== null && discounted?.amount !== undefined) {
              nextConfig.promoPrices[key] = Number(discounted.amount).toLocaleString(
                "en-US",
                { maximumFractionDigits: 2 },
              )
              nextConfig.promoActive[key] = true
            }
          }
        })

        const nextModels = Array.from(grouped.values()).map((model) => ({
          ...model,
          services: model.services.includes("charging")
            ? model.services
            : [...model.services, "charging" as ServiceId],
          serviceLabels: {
            ...model.serviceLabels,
            charging: "Diagnóstico de carga",
          },
        }))
        if (!nextModels.length) throw new Error("catalog")

        setModels(nextModels)
        setConfig(nextConfig)
        setSelectedModel((current) =>
          current
            ? nextModels.find((model) => model.id === current.id) ?? null
            : null,
        )
        setCatalogStatus("ready")
      } catch {
        if (!active) return
        setModels([])
        setCatalogStatus("error")
      }
    }

    refreshCatalog()
    const interval = window.setInterval(refreshCatalog, 30_000)
    const onPageShow = () => refreshCatalog()
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCatalog()
    }
    window.addEventListener("pageshow", onPageShow)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener("pageshow", onPageShow)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return models
    return models.filter((model) =>
      `${model.name} ${model.family}`.toLocaleLowerCase().includes(normalized),
    )
  }, [models, query])

  const visibleServices =
    selectedModel?.services.filter(
      (service) => config.enabled[`${selectedModel.id}-${service}`] !== false,
    ) ?? []

  function chooseModel(model: Model) {
    setSelectedModel(model)
    setSelectedService(null)
    setSelectedOption(null)
    setView("model")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function chooseHomeModel(model: Model) {
    if (selectionTimer.current) window.clearTimeout(selectionTimer.current)
    setPendingModelId(model.id)
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    selectionTimer.current = window.setTimeout(
      () => {
        chooseModel(model)
        setPendingModelId(null)
      },
      reducedMotion ? 0 : 200,
    )
  }

  function chooseService(service: ServiceId) {
    setSelectedService(service)
    setSelectedOption(null)
    setView(service === "screen" ? "options" : "summary")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function itemKey(option?: OptionId | null) {
    if (!selectedModel || !selectedService) return ""
    return `${selectedModel.id}-${selectedService}${option ? `-${option}` : ""}`
  }

  function consultationMessage() {
    if (!selectedModel || !selectedService) return ""
    const priceKey = itemKey(selectedOption)
    const currentPrice = config.prices[priceKey]
    const finalPrice =
      config.promoActive[priceKey] && config.promoPrices[priceKey]
        ? config.promoPrices[priceKey]
        : currentPrice
    const pricePrefix =
      config.priceModes[priceKey] === "from" ? "Desde RD$ " : "RD$ "
    const problemName = clientServiceTitle(selectedModel, selectedService)
    const serviceName = repairServiceTitle(selectedModel, selectedService)
    const lines = [
      `Hola, Celvis. Quisiera consultar una reparación para mi ${selectedModel.name}.`,
      `Problema: ${problemName}.`,
      `Servicio: ${serviceName}.`,
    ]
    if (selectedOption) {
      lines.push(
        `Opción: ${OPTIONS[selectedOption].label} (${OPTIONS[selectedOption].technical}).`,
      )
    }
    lines.push(
      `Precio mostrado: ${
        finalPrice ? `${pricePrefix}${finalPrice}` : "Consultar precio"
      }.`,
      "¿Podrían confirmarme disponibilidad y qué incluye?",
    )
    return lines.join("\n")
  }

  function openWhatsApp() {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      consultationMessage(),
    )}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function openServiceInfoWhatsApp() {
    if (!selectedModel) return
    const message = `Hola, Celvis. Quisiera consultar la ubicación y las opciones de atención para reparar mi ${selectedModel.name}.`
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  function openHelp() {
    setReturnView(view === "model" ? "model" : "home")
    setView("help")
  }

  function goHome() {
    setView("home")
    setSelectedService(null)
    setSelectedOption(null)
  }

  if (view === "pin") {
    return (
      <div className="app precision-theme">
        <Header onHome={goHome} onAdmin={goHome} />
        <main className="center-page">
          <button className="back-link" onClick={goHome}>
            <Icon name="back" /> Volver al sitio
          </button>
          <section className="pin-card">
            <div className="eyebrow">Área del propietario</div>
            <h1>Modo tienda</h1>
            <p>
              Edita la demostración del catálogo y revisa cómo se verá para tus
              clientes.
            </p>
            <div className="notice">
              <b>Esto es una simulación.</b> El PIN no ofrece seguridad real ni
              protege datos.
            </div>
            <label className="field-label" htmlFor="pin">
              PIN de demostración
            </label>
            <input
              id="pin"
              className="text-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value)
                setPinError("")
              }}
              placeholder="Escribe 2580"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (pin === "2580") setView("admin")
                  else
                    setPinError("Ese PIN no coincide. Para esta demo usa 2580.")
                }
              }}
            />
            {pinError && (
              <p className="error-text" role="alert">
                {pinError}
              </p>
            )}
            <button
              className="primary-button full"
              onClick={() => {
                if (pin === "2580") setView("admin")
                else
                  setPinError("Ese PIN no coincide. Para esta demo usa 2580.")
              }}
            >
              Entrar a la demostración <Icon name="arrow" />
            </button>
          </section>
        </main>
      </div>
    )
  }

  if (view === "admin") {
    return (
      <div className="app admin-app precision-theme">
        <Header
          onHome={() => setView("home")}
          onAdmin={goHome}
          admin
        />
        <main className="admin-main">
          <div className="admin-title-row">
            <div>
              <div className="eyebrow">Configuración del prototipo</div>
              <h1>Catálogo y promociones</h1>
              <p>Solo se muestra al cliente lo que actives aquí.</p>
            </div>
            <button className="primary-button" onClick={goHome}>
              <Icon name="eye" /> Previsualizar cliente
            </button>
          </div>
          <div className="admin-note">
            Los cambios se conservan mientras mantengas abierta esta
            demostración. No se guardan datos reales.
          </div>
          <div className="admin-list">
            {models.map((model) => (
              <section className="admin-model" key={model.id}>
                <div className="admin-model-heading">
                  <div>
                    <span>{model.family}</span>
                    <h2>{model.name}</h2>
                  </div>
                  <span>{model.services.length} servicios</span>
                </div>
                {model.services.map((service) => {
                  const key = `${model.id}-${service}`
                  const isScreen = service === "screen"
                  return (
                    <div className="admin-service" key={service}>
                      <div className="admin-service-top">
                        <div>
                          <b>{SERVICES[service].title}</b>
                          <small>
                            {isScreen
                              ? "2 opciones de pantalla"
                              : "Servicio general"}
                          </small>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={config.enabled[key] !== false}
                            onChange={(event) =>
                              setConfig((old) => ({
                                ...old,
                                enabled: {
                                  ...old.enabled,
                                  [key]: event.target.checked,
                                },
                              }))
                            }
                          />
                          <span /> Visible
                        </label>
                      </div>
                      {(isScreen
                        ? ["incell", "oled"] as OptionId[]
                        : [null]
                      ).map((option) => {
                        const priceKey = `${key}${option ? `-${option}` : ""}`
                        return (
                          <div className="price-editor" key={priceKey}>
                            <b>
                              {option
                                ? OPTIONS[option].technical
                                : "Precio del servicio"}
                            </b>
                            <label>
                              Precio regular
                              <span className="money-input">
                                RD$
                                <input
                                  inputMode="decimal"
                                  placeholder="Sin definir"
                                  value={config.prices[priceKey] ?? ""}
                                  onChange={(event) =>
                                    setConfig((old) => ({
                                      ...old,
                                      prices: {
                                        ...old.prices,
                                        [priceKey]: event.target.value.replace(
                                          /[^\d.,]/g,
                                          "",
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </span>
                            </label>
                            <label>
                              Precio promocional
                              <span className="money-input">
                                RD$
                                <input
                                  inputMode="decimal"
                                  placeholder="Sin definir"
                                  value={config.promoPrices[priceKey] ?? ""}
                                  onChange={(event) =>
                                    setConfig((old) => ({
                                      ...old,
                                      promoPrices: {
                                        ...old.promoPrices,
                                        [priceKey]: event.target.value.replace(
                                          /[^\d.,]/g,
                                          "",
                                        ),
                                      },
                                    }))
                                  }
                                />
                              </span>
                            </label>
                            <label className="switch promotion-switch">
                              <input
                                type="checkbox"
                                checked={config.promoActive[priceKey] ?? false}
                                onChange={(event) =>
                                  setConfig((old) => ({
                                    ...old,
                                    promoActive: {
                                      ...old.promoActive,
                                      [priceKey]: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              <span /> Promoción activa
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app precision-theme">
      {showWelcome && <WelcomeIntro onComplete={() => setShowWelcome(false)} />}
      {view === "home" ? (
        <HomeHeader onHelp={openHelp} />
      ) : (
        <Header
          onHome={goHome}
          onAdmin={() => setView("pin")}
          query={query}
          onQueryChange={setQuery}
        />
      )}
      {view !== "home" && (
        <div className="global-progress">
          <Progress
            step={
              view === "summary"
                ? 3
                : view === "model" || view === "options"
                  ? 2
                  : 1
            }
          />
        </div>
      )}

      {view === "home" && (
        <main className="home-proposal">
          <section className="home-intro">
            <div className="hero-copy">
              <Progress step={1} />
              <h1>¿Cuál es tu equipo?</h1>
              <p>Vamos a encontrar su solución.</p>
              <label className="home-search">
                <span>Buscar modelo</span>
                <span className="home-search-control">
                  <Icon name="search" size={20} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ej.: iPhone 13"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Limpiar búsqueda"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  )}
                </span>
              </label>
              <button className="help-link" onClick={openHelp}>
                No sé mi modelo
              </button>
            </div>
          </section>

          <section className="catalog">
            <div className="section-heading">
              <div>
                <h2>
                  {query
                    ? `Coincidencias para “${query}”`
                    : "Modelos"}
                </h2>
              </div>
              <small>
                {catalogStatus === "ready"
                  ? `${filteredModels.length} ${
                      filteredModels.length === 1 ? "modelo" : "modelos"
                    }`
                  : ""}
              </small>
            </div>
            {catalogStatus === "loading" ? (
              <div className="catalog-status" role="status">
                <span />
                Consultando catálogo y precios…
              </div>
            ) : catalogStatus === "error" ? (
              <div className="empty-state">
                <span>Conexión temporalmente no disponible</span>
                <h2>No pudimos consultar los precios</h2>
                <p>Intenta nuevamente para ver el catálogo actualizado.</p>
                <button
                  className="secondary-button"
                  onClick={() => window.location.reload()}
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="empty-state">
                <span>Sin coincidencias</span>
                <h2>No encontramos ese modelo</h2>
                <p>
                  Revisa el nombre o permítenos ayudarte a identificarlo.
                </p>
                <div>
                  <button className="primary-button" onClick={openHelp}>
                    Pedir ayuda
                  </button>
                </div>
              </div>
            ) : (
              <div className="model-groups">
                {Array.from(
                  new Set(filteredModels.map((model) => model.family)),
                ).map((family) => (
                  <div className="model-group" key={family}>
                    <div className="family-label">{family}</div>
                    <div>
                      {filteredModels
                        .filter((model) => model.family === family)
                        .map((model) => (
                          <button
                            className={`model-row ${
                              pendingModelId === model.id ? "chosen" : ""
                            }`}
                            key={model.id}
                            onClick={() => chooseHomeModel(model)}
                            aria-label={`Elegir modelo ${model.name}`}
                            aria-pressed={pendingModelId === model.id}
                          >
                            <span>
                              <b>{model.name}</b>
                            </span>
                            <span className="model-action">
                              {pendingModelId === model.id ? (
                                <>
                                  <Icon name="check" /> Elegido
                                </>
                              ) : (
                                <Icon name="arrow" />
                              )}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!query && (
              <p className="sample-note">
                Precios consultados en línea. Confirma disponibilidad antes de
                reparar.
              </p>
            )}
          </section>
        </main>
      )}

      {view === "help" && (
        <main className="flow-page narrow">
          <button className="back-link" onClick={() => setView(returnView)}>
            <Icon name="back" /> Volver sin perder mi progreso
          </button>
          <div className="eyebrow">Te ayudamos a encontrarlo</div>
          <h1>No necesitas saber de tecnología</h1>
          <p className="lead">
            Prueba una de estas formas. Toma menos de un minuto.
          </p>
          <div className="help-steps">
            <article>
              <span>01</span>
              <div>
                <h2>Revisa en Ajustes</h2>
                <p>
                  En iPhone: <b>Ajustes → General → Información.</b>
                  <br />
                  En Android: <b>Ajustes → Acerca del teléfono.</b>
                </p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h2>Mira la caja o la factura</h2>
                <p>
                  El nombre suele aparecer cerca del código de barras o en la
                  descripción de compra.
                </p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h2>Si aún no aparece, no pasa nada</h2>
                <p>
                  Puedes enviarnos una foto del equipo al momento de consultar y
                  te ayudaremos a identificarlo.
                </p>
              </div>
            </article>
          </div>
          <button
            className="primary-button"
            onClick={() => setView(returnView)}
          >
            Ya sé cómo encontrarlo <Icon name="arrow" />
          </button>
        </main>
      )}

      {view === "model" && selectedModel && (
        <main className="flow-page model-page">
          <section className="model-detail">
            <DeviceThumbnail model={selectedModel} />
            <div className="detail-content">
              <h1>{selectedModel.name}</h1>
              <button
                className="secondary-button model-change-button"
                onClick={() => setView("home")}
              >
                Cambiar modelo
              </button>
            </div>
            <div className="question-heading">
              <h2 id="services-title">¿Qué le pasa?</h2>
              <p>Elige el problema que más se parezca.</p>
            </div>
            {visibleServices.length ? (
              <div className="service-list">
                {visibleServices.map((service) => {
                  const key = `${selectedModel.id}-${service}`
                  return (
                    <button
                      key={service}
                      className={`service-row ${
                        selectedService === service ? "selected" : ""
                      }`}
                      onClick={() => chooseService(service)}
                      aria-label={serviceActionLabel(selectedModel, service)}
                      aria-pressed={selectedService === service}
                    >
                      <span className="service-icon">
                        <ServiceGlyph service={service} />
                      </span>
                      <span className="service-copy">
                        <b>{clientServiceTitle(selectedModel, service)}</b>
                        <small>
                          {config.notes[key]?.trim() ||
                            SERVICES[service].description}
                        </small>
                        {config.promoActive[key] && (
                          <span className="service-promo">Oferta especial</span>
                        )}
                      </span>
                      <span className="service-meta">
                        <Price
                          config={config}
                          itemKey={key}
                          compact
                          emptyLabel="Cotizar"
                        />
                        <span className="service-arrow" aria-hidden="true">
                          <Icon name="arrow" />
                        </span>
                      </span>
                    </button>
                  )
                })}
                <p className="services-whatsapp-note">
                  Te confirmamos qué incluye y la garantía por WhatsApp.
                </p>
              </div>
            ) : (
              <div className="inline-empty">
                <b>No hay servicios visibles para este modelo.</b>
                <p>
                  El catálogo puede estar actualizándose. Prueba con otro
                  modelo.
                </p>
              </div>
            )}
          </section>
        </main>
      )}

      {view === "options" && selectedModel && selectedService === "screen" && (
        <main className="flow-page options-page">
          <button className="back-link" onClick={() => setView("model")}>
            <Icon name="back" /> Volver a los problemas
          </button>
          <div className="context-line">
            <span>{selectedModel.name}</span>
            <i /> Pantalla rota
          </div>
          <div className="options-heading">
            <div>
              <h1 ref={stepHeadingRef} tabIndex={-1}>
                Elige la pantalla
              </h1>
              <p>Compara las dos opciones disponibles para este equipo.</p>
            </div>
          </div>
          <div className="option-grid">
            {selectedModel.screenOptions.map((option, index) => {
              const data = OPTIONS[option]
              const selected = selectedOption === option
              return (
                <article
                  className={`option-card ${selected ? "selected" : ""}`}
                  key={option}
                >
                  <button
                    className="option-select"
                    onClick={() => setSelectedOption(option)}
                    aria-pressed={selected}
                    aria-label={`Continuar con ${data.label}`}
                  >
                    <span className="option-number">0{index + 1}</span>
                    <span className="radio">
                      <Icon name="check" size={15} />
                    </span>
                    <span className="option-copy">
                      <b>{data.label}</b>
                      <small>{data.technical}</small>
                      <p>{data.benefit}</p>
                    </span>
                    <Price config={config} itemKey={itemKey(option)} />
                    <RepairTerms
                      config={config}
                      itemKey={itemKey(option)}
                    />
                    <span className="option-state">
                      <Icon name="check" size={17} />
                      {selected ? "Elegida" : "Elegir esta opción"}
                    </span>
                  </button>
                  <dl className="option-facts">
                    <div>
                      <dt>Tamaño</dt>
                      <dd>Correspondiente a {selectedModel.name}</dd>
                    </div>
                    <div>
                      <dt>Compatibilidad</dt>
                      <dd>Se confirma antes de instalar</dd>
                    </div>
                    <div>
                      <dt>Disponibilidad</dt>
                      <dd>Se confirma al consultar</dd>
                    </div>
                  </dl>
                  <button
                    className="details-toggle"
                    onClick={() =>
                      setExpandedOption(
                        expandedOption === option ? null : option,
                      )
                    }
                  >
                    {expandedOption === option
                      ? "Ocultar detalles"
                      : "Ver detalles"}{" "}
                    <span>{expandedOption === option ? "−" : "+"}</span>
                  </button>
                  {expandedOption === option && (
                    <div className="option-detail">{data.detail}</div>
                  )}
                </article>
              )
            })}
          </div>
          <div className="sticky-action">
            <span>
              {selectedOption
                ? `Selección confirmada: ${OPTIONS[selectedOption].label}`
                : "Selecciona una opción para continuar"}
            </span>
            <button
              className="primary-button"
              disabled={!selectedOption}
              onClick={() => setView("summary")}
            >
              Continuar con esta opción <Icon name="arrow" />
            </button>
          </div>
        </main>
      )}

      {view === "summary" && selectedModel && selectedService && (
        <main className="flow-page summary-page">
          <button
            className="back-link"
            onClick={() =>
              setView(selectedService === "screen" ? "options" : "model")
            }
          >
            <Icon name="back" /> Volver y editar
          </button>
          <section className="summary-simple">
            <h1 ref={stepHeadingRef} tabIndex={-1}>
              ¿Lo revisamos juntos?
            </h1>
            <div className="summary-card">
              <div>
                <span>Modelo</span>
                <b>{selectedModel.name}</b>
                <button onClick={() => setView("home")}>Cambiar</button>
              </div>
              <div>
                <span>Problema</span>
                <b>{clientServiceTitle(selectedModel, selectedService)}</b>
                <button onClick={() => setView("model")}>Cambiar</button>
              </div>
              <div>
                <span>Servicio</span>
                <b>{repairServiceTitle(selectedModel, selectedService)}</b>
                <button onClick={() => setView("model")}>Cambiar</button>
              </div>
              {selectedOption && (
                <div>
                  <span>Opción</span>
                  <b>
                    {OPTIONS[selectedOption].label}
                    <small>{OPTIONS[selectedOption].technical}</small>
                  </b>
                  <button onClick={() => setView("options")}>Cambiar</button>
                </div>
              )}
              <div className="summary-total">
                <span>Precio</span>
                <Price config={config} itemKey={itemKey(selectedOption)} />
              </div>
            </div>
            <div className="summary-details">
              <RepairTerms
                config={config}
                itemKey={itemKey(selectedOption)}
              />
              <span>
                Te confirmamos la modalidad de atención por WhatsApp.
              </span>
              <button className="text-button" onClick={openServiceInfoWhatsApp}>
                Consultar ubicación y atención
              </button>
            </div>
            <button
              className="whatsapp-button"
              onClick={openWhatsApp}
            >
              Consultar por WhatsApp <Icon name="arrow" />
            </button>
            <p className="whatsapp-note">
              Revisa el mensaje y envíalo cuando quieras.
            </p>
          </section>
        </main>
      )}

      <footer className="site-footer">
        <Logo />
        <p>Ayuda clara para cuidar tu equipo.</p>
        <button onClick={() => setView("pin")}>Acceso tienda</button>
      </footer>
    </div>
  )
}

export default App
