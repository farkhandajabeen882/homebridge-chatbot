"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import rules from "./rules.json";

type HomeType = "Rent" | "Buy";
type FilterType = "All" | HomeType;
type SearchStep = "type" | "area" | "budget" | "beds";

type Property = {
  id: string;
  name: string;
  area: string;
  type: HomeType;
  price: number;
  beds: number;
  baths: number;
  furnished: string;
  description: string;
  features: string[];
  photos: string[];
};

type Message = {
  id: number;
  role: "bot" | "user";
  text: string;
  propertyIds?: string[];
};

type SearchPreferences = {
  type: HomeType;
  area: string;
  budget: number;
};

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

const photos = {
  house: photo("photo-1600596542815-ffad4c1539a9"),
  living: photo("photo-1600607687939-ce8a6c25118c"),
  lounge: photo("photo-1600210492486-724fe5c67fb0"),
  apartment: photo("photo-1522708323590-d24dbb6b0267"),
};

const properties: Property[] = [
  {
    id: "HB101",
    name: "Maple Apartment",
    area: "Central District",
    type: "Rent",
    price: 1250,
    beds: 2,
    baths: 1,
    furnished: "Furnished",
    description:
      "A bright apartment with an open living area and a calm, neutral interior. A fictional home designed for this portfolio demonstration.",
    features: ["Open-plan living", "Fitted kitchen", "Storage space"],
    photos: [photos.living, photos.lounge, photos.apartment],
  },
  {
    id: "HB102",
    name: "Park View Flat",
    area: "Green Park",
    type: "Rent",
    price: 1450,
    beds: 2,
    baths: 2,
    furnished: "Unfurnished",
    description:
      "A spacious flat with room to make your own. This fictional listing demonstrates property discovery and customer enquiries.",
    features: ["Balcony", "Two bathrooms", "Dining area"],
    photos: [photos.lounge, photos.apartment, photos.living],
  },
  {
    id: "HB103",
    name: "Riverside Studio",
    area: "Riverside",
    type: "Rent",
    price: 1100,
    beds: 0,
    baths: 1,
    furnished: "Furnished",
    description:
      "A compact studio with a comfortable living and sleeping area. This is an illustrative listing rather than a real available property.",
    features: ["Studio layout", "Compact kitchen", "Built-in storage"],
    photos: [photos.apartment, photos.living, photos.lounge],
  },
  {
    id: "HB201",
    name: "Oakwood Family Home",
    area: "Oakwood District",
    type: "Buy",
    price: 325000,
    beds: 3,
    baths: 2,
    furnished: "Unfurnished",
    description:
      "A contemporary family home with generous living space and a private garden. All details and images are for demonstration.",
    features: ["Private garden", "Family living area", "Two bathrooms"],
    photos: [photos.house, photos.living, photos.lounge],
  },
];

const money = (value: number) =>
  `£${value.toLocaleString("en-GB")}`;

const bedroomLabel = (beds: number) =>
  beds === 0 ? "Studio" : `${beds} bedrooms`;

const welcome: Message = {
  id: 1,
  role: "bot",
  text:
    "Hi! Welcome to HomeBridge 👋\n\n" +
    "I can help you explore homes, compare your options and learn about viewings.\n\n" +
    "Choose Find my home for a guided search, or ask a question below.",
};

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function ruleReply(value: string) {
  const message = ` ${normalize(value)} `;

  return rules.find((rule) =>
    rule.keywords.some((keyword) => {
      const word = normalize(keyword);
      return word && message.includes(` ${word} `);
    }),
  );
}

const buttonClass =
  "rounded-xl border border-[#d8e1d6] bg-white px-4 py-2.5 text-sm font-medium text-[#244e43] transition hover:bg-[#edf3e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

const primaryClass =
  "rounded-xl bg-[#244e43] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173b31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function Home() {
  const [filter, setFilter] = useState<FilterType>("All");
  const [area, setArea] = useState("All");
  const [budget, setBudget] = useState("");
  const [beds, setBeds] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");

  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [step, setStep] = useState<SearchStep | null>(null);
  const [preferences, setPreferences] = useState<SearchPreferences>({
    type: "Rent",
    area: "Any",
    budget: 1500,
  });

  const [selected, setSelected] = useState<Property | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [viewingMode, setViewingMode] = useState(false);
  const [viewingSummary, setViewingSummary] = useState("");
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("Morning");

  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const idRef = useRef(2);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem("homebridge-favourites") ?? "[]",
      );
      if (Array.isArray(stored)) {
        setSaved(
          stored.filter(
            (id): id is string =>
              typeof id === "string" &&
              properties.some((property) => property.id === id),
          ),
        );
      }
    } catch {
      setStorageNotice("Favourites are available for this visit only.");
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem("homebridge-favourites", JSON.stringify(saved));
    } catch {
      setStorageNotice("Favourites are available for this visit only.");
    }
  }, [saved, storageReady]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, chatOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    if (!selected && dialog?.open) dialog.close();
  }, [selected]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function addMessage(
    role: Message["role"],
    text: string,
    propertyIds?: string[],
  ) {
    setMessages((current) => [
      ...current,
      { id: idRef.current++, role, text, propertyIds },
    ]);
  }

  function respond(action: () => void) {
    busyRef.current = true;
    setTyping(true);
    timerRef.current = setTimeout(() => {
      action();
      setTyping(false);
      busyRef.current = false;
      timerRef.current = null;
    }, 600);
  }

  function startSearch() {
    if (busyRef.current) return;
    setChatOpen(true);
    addMessage("user", "Help me find a home");
    respond(() => {
      setStep("type");
      addMessage("bot", "Let's find your kind of home.\n\nWould you like to rent or buy?");
    });
  }

  function sendMessage(value: string) {
    const text = value.trim().slice(0, 500);
    if (!text || busyRef.current) return;

    setInput("");
    setChatOpen(true);
    addMessage("user", text);

    respond(() => {
      const normalized = normalize(text);

      if (["cancel", "stop", "exit"].includes(normalized)) {
        setStep(null);
        addMessage("bot", "Search cancelled. You can ask a question or start again.");
        return;
      }

      if (step === "type") {
        const type =
          /\b(rent|renting|rental)\b/.test(normalized)
            ? "Rent"
            : /\b(buy|buying|purchase)\b/.test(normalized)
              ? "Buy"
              : null;

        if (!type) {
          addMessage("bot", "Please choose Rent or Buy. Type cancel to leave the search.");
          return;
        }

        setPreferences((current) => ({ ...current, type }));
        setStep("area");
        addMessage("bot", "Which area do you prefer?\n\nChoose an area below, or select Any area.");
        return;
      }

      if (step === "area") {
        const matchedArea = properties.find(
          (property) => normalize(property.area) === normalized,
        )?.area;

        const nextArea = ["any", "any area", "all"].includes(normalized)
          ? "Any"
          : matchedArea;

        if (!nextArea) {
          addMessage("bot", "Please select one of the area buttons, or choose Any area.");
          return;
        }

        setPreferences((current) => ({ ...current, area: nextArea }));
        setStep("budget");
        addMessage(
          "bot",
          `What is your maximum ${
            preferences.type === "Rent" ? "monthly rent" : "purchase budget"
          } in pounds?\n\nEnter a number, for example ${
            preferences.type === "Rent" ? "1500" : "350000"
          }.`,
        );
        return;
      }

      if (step === "budget") {
        const cleaned = text.replace(/[£,\s]/g, "");
        const amount = Number(cleaned);

        if (!/^\d+(\.\d{1,2})?$/.test(cleaned) || amount <= 0) {
          addMessage("bot", "Please enter a positive number, such as 1500 or 350000.");
          return;
        }

        setPreferences((current) => ({ ...current, budget: amount }));
        setStep("beds");
        addMessage("bot", "How many bedrooms do you need?\n\nChoose Studio, 1, 2, 3, or Any.");
        return;
      }

      if (step === "beds") {
        const bedroomValue =
          normalized === "studio" ? 0 :
          ["any", "any bedrooms"].includes(normalized) ? -1 :
          /^[0-3]$/.test(normalized) ? Number(normalized) : null;

        if (bedroomValue === null) {
          addMessage("bot", "Please choose Studio, 1, 2, 3, or Any.");
          return;
        }

        const matches = properties.filter(
          (property) =>
            property.type === preferences.type &&
            (preferences.area === "Any" || property.area === preferences.area) &&
            property.price <= preferences.budget &&
            (bedroomValue === -1 || property.beds === bedroomValue),
        );

        setStep(null);
        addMessage(
          "bot",
          matches.length
            ? `I found ${matches.length} matching demo ${
                matches.length === 1 ? "home" : "homes"
              }.\n\nOpen a property to explore its details and illustrative gallery. Availability requires confirmation.`
            : "No demo properties match all those preferences.\n\nTry Find my home again with Any area, Any bedrooms or a different budget.",
          matches.map((property) => property.id),
        );
        return;
      }

      const referenced = properties.find(
        (property) =>
          ` ${normalized} `.includes(` ${normalize(property.id)} `) ||
          normalized.includes(normalize(property.name)),
      );

      if (referenced) {
        addMessage(
          "bot",
          `${referenced.name} · ${referenced.id}\n\n` +
            `${referenced.area}\n${bedroomLabel(referenced.beds)} · ` +
            `${referenced.baths} bathroom(s) · ${referenced.furnished}\n` +
            `${money(referenced.price)}${referenced.type === "Rent" ? " per month, bills excluded" : " asking price"}\n\n` +
            "Explore the property card below for more details.",
          [referenced.id],
        );
        return;
      }

      const match = ruleReply(text);
      addMessage(
        "bot",
        match?.reply ??
          "I could not match that question.\n\nTry rent, buy, viewings, deposit, documents, pets, fees or contact. You can also use Find my home.",
        match?.intent === "rent"
          ? properties.filter((property) => property.type === "Rent").map((property) => property.id)
          : match?.intent === "buy"
            ? ["HB201"]
            : match?.intent === "properties"
              ? properties.map((property) => property.id)
              : undefined,
      );
    });
  }

  function resetChat() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    busyRef.current = false;
    setTyping(false);
    setStep(null);
    setInput("");
    setMessages([welcome]);
    idRef.current = 2;
  }

  function openProperty(property: Property) {
    setPhotoIndex(0);
    setViewingMode(false);
    setViewingSummary("");
    setViewingDate("");
    setSelected(property);
  }

  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function submitViewing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !viewingDate) return;

    const date = new Date(`${viewingDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      setViewingSummary("Please select today or a future date.");
      return;
    }

    setViewingSummary(
      `DEMO SUMMARY — NOT SUBMITTED\n\n${selected.name} (${selected.id})\n` +
        `Preferred date: ${date.toLocaleDateString("en-GB")}\n` +
        `Preferred time: ${viewingTime}\n\n` +
        "This preview has not been sent or saved. No appointment has been booked.",
    );
  }

  const filtered = properties.filter(
    (property) =>
      (filter === "All" || property.type === filter) &&
      (area === "All" || property.area === area) &&
      (!budget || property.price <= Number(budget)) &&
      (beds === "All" || property.beds === Number(beds)) &&
      (!savedOnly || saved.includes(property.id)),
  );

  const choices =
    step === "type" ? ["Rent", "Buy"] :
    step === "area" ? ["Any area", ...Array.from(new Set(properties.map((p) => p.area)))] :
    step === "budget" ? preferences.type === "Rent"
      ? ["1100", "1250", "1500", "2000"]
      : ["250000", "325000", "350000", "500000"] :
    step === "beds" ? ["Studio", "1", "2", "3", "Any"] : [];

  return (
    <main className="min-h-dvh bg-[#f5f7f2] text-[#183d34]">
      <header className="border-b border-[#dfe5da] bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4">
          <a href="#" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#244e43] text-2xl text-white" aria-hidden="true">⌂</span>
            <span>
              <span className="block text-xl font-bold">HomeBridge<span className="text-[#aa8146]">.</span></span>
              <span className="text-[10px] tracking-[0.18em] text-slate-500">YOUR NEXT CHAPTER</span>
            </span>
          </a>
          <nav className="hidden gap-6 text-sm md:flex" aria-label="Main navigation">
            <a href="#collection">Explore homes</a>
            <button onClick={() => { setSavedOnly((value) => !value); document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" }); }}>
              Saved homes ({saved.length})
            </button>
          </nav>
          <span className="rounded-full border border-[#e4d8bf] bg-[#faf6ed] px-3 py-2 text-xs text-[#8a6837]">Portfolio demo</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] items-start gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0">
          <section className="relative isolate overflow-hidden rounded-[28px] bg-[#183d34]">
            <Image src={photos.house} alt="Illustrative modern home with a garden" fill unoptimized priority sizes="(min-width: 1024px) 65vw, 100vw" className="-z-20 object-cover" />
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#102e25]/95 via-[#102e25]/65 to-transparent" />
            <div className="px-6 py-12 sm:px-9 sm:py-14">
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-2 text-[10px] tracking-widest text-white">SPACES TO FEEL AT HOME</span>
              <h1 className="mt-7 font-serif text-5xl leading-[1.08] text-white sm:text-6xl">Find a home.<br />Start your<br /><span className="text-[#e6c58f] italic">next chapter.</span></h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/80">Explore thoughtfully presented demo homes, discover the details and find your favourite space.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#collection" className="rounded-xl bg-[#e6c58f] px-5 py-3 text-sm font-semibold text-[#183d34]">Explore homes ↗</a>
                <button onClick={startSearch} disabled={typing} className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Help me choose</button>
              </div>
              <p className="mt-7 text-[10px] text-white/60">Fictional listings · Illustrative photography</p>
            </div>
          </section>

          <div className="my-5 grid grid-cols-3 gap-2">
            {[
              ["04", "Demo homes"],
              ["Buy & Rent", "Two ways to begin"],
              ["Your shortlist", "Save your favourites"],
            ].map(([title, subtitle]) => (
              <div key={title} className="rounded-2xl border border-[#dfe5da] bg-white p-3 sm:p-4">
                <p className="text-sm font-semibold sm:text-lg">{title}</p>
                <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">{subtitle}</p>
              </div>
            ))}
          </div>

          <section id="collection" className="scroll-mt-5 pt-4">
            <p className="text-[10px] font-bold tracking-[0.2em] text-[#9b743b]">EXPLORE THE COLLECTION</p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">Your home, your preferences.</h2>
            <p className="mt-2 text-sm text-slate-500">Filter, shortlist and take a closer look.</p>

            <div className="mt-5 rounded-2xl border border-[#dfe5da] bg-white p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {(["All", "Rent", "Buy"] as const).map((value) => (
                  <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setBudget(""); }} className={filter === value ? primaryClass : buttonClass}>
                    {value === "All" ? "All homes" : value}
                  </button>
                ))}
                <button aria-pressed={savedOnly} onClick={() => setSavedOnly((value) => !value)} className={savedOnly ? primaryClass : buttonClass}>♡ Saved ({saved.length})</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium">Area
                  <select value={area} onChange={(event) => setArea(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-[#f8faf6] p-3 text-sm">
                    <option value="All">All areas</option>
                    {properties.map((property) => <option key={property.id} value={property.area}>{property.area}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium">Maximum price (£){filter !== "Buy" && " / month for rentals"}
                  <input type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Any budget" className="mt-2 w-full rounded-xl border border-slate-200 bg-[#f8faf6] p-3 text-sm" />
                </label>
                <label className="text-xs font-medium">Bedrooms
                  <select value={beds} onChange={(event) => setBeds(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-[#f8faf6] p-3 text-sm">
                    <option value="All">Any bedrooms</option>
                    <option value="0">Studio</option>
                    <option value="1">1 bedroom</option>
                    <option value="2">2 bedrooms</option>
                    <option value="3">3 bedrooms</option>
                  </select>
                </label>
              </div>
              {filter === "All" && budget && <p className="mt-3 text-xs text-slate-500">The limit applies to monthly rent or purchase price. Choose Rent or Buy to compare the same price type.</p>}
              <div className="mt-4 flex justify-between text-xs">
                <span>{filtered.length} demo homes found</span>
                <button onClick={() => { setFilter("All"); setArea("All"); setBudget(""); setBeds("All"); setSavedOnly(false); }} className="font-semibold underline">Reset filters</button>
              </div>
              {storageNotice && <p role="status" className="mt-2 text-xs text-slate-500">{storageNotice}</p>}
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {filtered.map((property) => (
                <article key={property.id} className="overflow-hidden rounded-3xl border border-[#dfe5da] bg-white shadow-sm transition hover:shadow-lg">
                  <div className="relative h-52">
                    <button onClick={() => openProperty(property)} aria-label={`View ${property.name} gallery`} className="absolute inset-0">
                      <Image src={property.photos[0]} alt={`Illustrative photograph for ${property.name}`} fill unoptimized sizes="(min-width: 1024px) 35vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    </button>
                    <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold">{property.type === "Rent" ? "TO RENT" : "FOR SALE"}</span>
                    <button onClick={() => toggleSaved(property.id)} aria-label={`${saved.includes(property.id) ? "Remove" : "Save"} ${property.name}`} aria-pressed={saved.includes(property.id)} className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-white text-2xl text-[#244e43] shadow">
                      {saved.includes(property.id) ? "♥" : "♡"}
                    </button>
                    <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 text-[9px] text-white">Illustrative photo</span>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-semibold tracking-wider text-[#9b743b]">{property.area.toUpperCase()} · {property.id}</p>
                    <h3 className="mt-2 font-serif text-2xl">{property.name}</h3>
                    <p className="mt-3 text-xs leading-6 text-slate-500">{bedroomLabel(property.beds)} · {property.baths} bath · {property.furnished}</p>
                    <p className="mt-3 text-xl font-bold">{money(property.price)}<span className="text-xs font-normal text-slate-500">{property.type === "Rent" ? " / month" : " asking price"}</span></p>
                    <button onClick={() => openProperty(property)} className={`${buttonClass} mt-4 w-full`}>View details & gallery ↗</button>
                  </div>
                </article>
              ))}
            </div>

            {filtered.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#bacbb6] bg-white p-8 text-center"><p className="font-serif text-2xl">No homes match yet.</p><p className="mt-2 text-sm text-slate-500">Adjust your filters or reset them to explore all four homes.</p></div>}
          </section>

          <section className="mt-7 rounded-3xl bg-[#e7eedf] p-7">
            <h2 className="font-serif text-3xl">A little guidance helps.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">Our property assistant can guide you through your preferences or answer questions about documents, deposits and viewings.</p>
            <button onClick={startSearch} disabled={typing} className={`${primaryClass} mt-5`}>Find my home ↗</button>
          </section>
          <footer className="py-7 text-xs leading-6 text-slate-500">HomeBridge portfolio demo. Properties, features, prices and contact details are fictional. Photos are illustrative. Rental bills are excluded. No real bookings or enquiries are submitted.</footer>
        </div>

        {/* Property assistant */}
        <aside id="homebridge-chat" aria-label="HomeBridge chatbot" className={`${chatOpen ? "flex" : "hidden"} fixed inset-x-2 bottom-2 z-40 h-[calc(100dvh-16px)] flex-col overflow-hidden rounded-3xl border border-[#d9e3d3] bg-white shadow-2xl lg:sticky lg:inset-auto lg:top-4 lg:flex lg:h-[calc(100dvh-120px)] lg:max-h-[950px]`}>
          <div className="flex shrink-0 items-center justify-between bg-[#244e43] px-5 py-4 text-white">
            <div>
              <h2 className="text-lg font-semibold">HomeBridge Assistant</h2>
              <p className="mt-1 text-xs text-white/75">Your property questions, made simpler.</p>
            </div>
            <button onClick={() => setChatOpen(false)} aria-label="Close chat" className="rounded-lg px-3 py-2 text-2xl lg:hidden">×</button>
          </div>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-[11px] text-slate-500">Rule-based · Demo information</span>
            <button onClick={resetChat} className="text-xs font-semibold">New chat ↻</button>
          </div>

          <div ref={scrollRef} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#f5f8f1] p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="min-w-0 max-w-[95%]">
                  <p className={`mb-1 text-[10px] font-semibold text-slate-500 ${message.role === "user" ? "text-right" : ""}`}>{message.role === "user" ? "YOU" : "HOMEBRIDGE"}</p>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap wrap-break-word ${message.role === "user" ? "rounded-tr-sm bg-[#244e43] text-white" : "rounded-tl-sm border border-[#dfe7d8] bg-white text-slate-700 shadow-sm"}`}>{message.text}</div>
                  {message.propertyIds?.map((id) => {
                    const property = properties.find((item) => item.id === id);
                    if (!property) return null;
                    return (
                      <button key={id} onClick={() => openProperty(property)} className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-[#dfe7d8] bg-white p-2 text-left shadow-sm transition hover:bg-[#edf3e9]">
                        <Image src={property.photos[0]} alt={`Illustrative ${property.name}`} width={76} height={76} unoptimized className="size-[76px] shrink-0 rounded-xl object-cover" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{property.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">{property.area} · {bedroomLabel(property.beds)}</span>
                          <span className="mt-1 block text-sm font-bold">{money(property.price)}{property.type === "Rent" ? " / month" : ""}</span>
                          <span className="block text-[10px] text-slate-500">View details · Illustrative photo ↗</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {typing && <p role="status" className="w-fit rounded-2xl border border-[#dfe7d8] bg-white px-4 py-3 text-sm text-slate-500"><span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-emerald-600" />typing...</p>}
          </div>

          <div className="max-h-[180px] shrink-0 overflow-y-auto border-t border-[#e3e9dc] px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-500">{step ? "CHOOSE YOUR ANSWER" : "HOW CAN I HELP?"}</p>
            <div className="flex flex-wrap gap-2">
              {step ? <>
                {choices.map((choice) => <button key={choice} onClick={() => sendMessage(choice)} disabled={typing} className="rounded-full border border-[#d8e1d2] px-3 py-2 text-xs hover:bg-[#edf3e9] disabled:opacity-50">{choice}</button>)}
                <button onClick={() => sendMessage("cancel")} disabled={typing} className="px-2 py-2 text-xs text-slate-500 underline disabled:opacity-50">Cancel search</button>
              </> : <>
                <button onClick={startSearch} disabled={typing} className="rounded-full bg-[#244e43] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Find my home ✨</button>
                {["Rent", "Buy", "Viewings", "Documents", "Deposit", "Contact"].map((topic) => <button key={topic} onClick={() => sendMessage(topic === "Viewings" ? "viewing" : topic)} disabled={typing} className="rounded-full border border-[#d8e1d2] px-3 py-2 text-xs hover:bg-[#edf3e9] disabled:opacity-50">{topic}</button>)}
              </>}
            </div>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); sendMessage(input); }} className="shrink-0 border-t border-slate-100 bg-white p-4">
            <label htmlFor="chat-input" className="sr-only">Your message</label>
            <div className="flex gap-2">
              <input id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} autoComplete="off" placeholder={step ? "Type your answer..." : "Ask a property question..."} className="min-w-0 flex-1 rounded-xl border border-[#cbd8c6] bg-[#fafcf8] px-3 py-3 text-base text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              <button type="submit" disabled={typing || !input.trim()} className={primaryClass}>Send</button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">Please do not share sensitive personal information.</p>
          </form>
        </aside>
      </div>

      {!chatOpen && <button onClick={() => setChatOpen(true)} aria-controls="homebridge-chat" aria-expanded={chatOpen} className="fixed right-4 bottom-4 z-30 rounded-full bg-[#244e43] px-5 py-4 text-sm font-semibold text-white shadow-xl lg:hidden">Chat with HomeBridge ↗</button>}

      {/* Native dialog provides keyboard focus handling and Escape to close */}
      <dialog ref={dialogRef} onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-24px)] max-w-3xl overflow-y-auto rounded-3xl border-0 bg-white p-0 text-[#183d34] shadow-2xl backdrop:bg-slate-950/70">
        {selected && (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
              <div><p className="text-[10px] text-slate-500">{selected.id} · DEMO PROPERTY</p><h2 className="text-lg font-semibold">{selected.name}</h2></div>
              <button autoFocus aria-label="Close property details" onClick={() => dialogRef.current?.close()} className="rounded-full bg-slate-100 px-3 py-1 text-2xl">×</button>
            </div>
            <div className="p-5 sm:p-6">
              <div className="relative h-60 overflow-hidden rounded-2xl sm:h-80">
                <Image src={selected.photos[photoIndex]} alt={`Illustrative gallery photo ${photoIndex + 1} for ${selected.name}`} fill unoptimized sizes="(min-width: 768px) 720px, 95vw" className="object-cover" />
                <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                  <button aria-label="Previous photo" onClick={() => setPhotoIndex((value) => (value - 1 + selected.photos.length) % selected.photos.length)} className="size-10 rounded-full bg-white/95 text-xl shadow">‹</button>
                  <button aria-label="Next photo" onClick={() => setPhotoIndex((value) => (value + 1) % selected.photos.length)} className="size-10 rounded-full bg-white/95 text-xl shadow">›</button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {selected.photos.map((src, index) => <button key={`${src}-${index}`} onClick={() => setPhotoIndex(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === photoIndex} className={`overflow-hidden rounded-xl border-2 ${index === photoIndex ? "border-emerald-700" : "border-transparent"}`}><Image src={src} alt="" width={90} height={64} unoptimized className="h-16 w-24 object-cover" /></button>)}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Illustrative gallery. These photographs are not verified images of one real property.</p>
              <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm text-slate-500">{selected.area}</p><h3 className="mt-1 font-serif text-3xl">{selected.name}</h3></div>
                <p className="text-2xl font-bold">{money(selected.price)}<span className="block text-right text-xs font-normal text-slate-500">{selected.type === "Rent" ? "per month · bills excluded" : "demo asking price"}</span></p>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{selected.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[bedroomLabel(selected.beds), `${selected.baths} bathroom(s)`, selected.furnished, ...selected.features].map((feature) => <span key={feature} className="rounded-lg bg-[#eff4e9] px-3 py-2 text-xs">{feature}</span>)}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setViewingMode((value) => !value)} className={primaryClass}>Preview a viewing request</button>
                <button onClick={() => toggleSaved(selected.id)} className={buttonClass}>{saved.includes(selected.id) ? "♥ Saved" : "♡ Save home"}</button>
              </div>

              {viewingMode && <form onSubmit={submitViewing} className="mt-5 rounded-2xl border border-[#dce5d5] bg-[#f7faf4] p-5">
                <h4 className="font-semibold">Viewing request preview</h4>
                <p className="mt-2 text-xs leading-6 text-slate-500">Choose your preferences. This demo generates a summary only; it does not check availability, send a request or book a viewing.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium">Preferred date<input required type="date" value={viewingDate} onChange={(event) => { setViewingDate(event.target.value); setViewingSummary(""); }} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-base" /></label>
                  <label className="text-xs font-medium">Preferred time<select value={viewingTime} onChange={(event) => { setViewingTime(event.target.value); setViewingSummary(""); }} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3 text-base"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
                </div>
                <button type="submit" className={`${primaryClass} mt-4`}>Generate demo summary</button>
                {viewingSummary && <p role="status" className="mt-4 rounded-xl border border-[#dce5d5] bg-white p-4 text-sm leading-7 whitespace-pre-wrap wrap-break-word">{viewingSummary}</p>}
              </form>}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}