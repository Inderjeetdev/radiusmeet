import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppGate } from "@/components/app-gate";
import { HOBBY_OPTIONS, type SmokeDrink } from "@/lib/economy";
import { saveProfile } from "@/lib/local-api";
import { getSessionAccount, localSignOut } from "@/lib/local-store";

export const Route = createFileRoute("/setup")({
  component: () => (
    <AppGate>
      <Setup />
    </AppGate>
  ),
});

const RADIUS_OPTIONS = [
  { km: 20, label: "20 km" },
  { km: 50, label: "50 km" },
  { km: 100, label: "100 km" },
] as const;

function Setup() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const account = getSessionAccount();
  const [name, setName] = useState("");
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<"woman" | "man" | "nonbinary">("woman");
  const [seeking, setSeeking] = useState<"women" | "men" | "everyone">("everyone");
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [smoke, setSmoke] = useState<SmokeDrink>("no");
  const [drink, setDrink] = useState<SmokeDrink>("no");
  const [area, setArea] = useState("");
  const [radiusKm, setRadiusKm] = useState<20 | 50 | 100>(50);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          displayName: name.trim(),
          age,
          gender,
          seeking,
          bio,
          photoData: photos[0] ?? null,
          photos,
          email: email.trim(),
          phone: phone.trim(),
          hobbies,
          smoke,
          drink,
          area: area.trim(),
          lat,
          lng,
          searchRadiusKm: radiusKm,
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["discover"] });
      void navigate({ to: "/discover" });
    },
    onError: (e: Error) => setError(e.message),
  });

  async function onPhoto(file: File) {
    if (photos.length >= 6) {
      setError("Maximum 6 photos.");
      return;
    }
    const bmp = await createImageBitmap(file);
    const size = 480;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(size / bmp.width, size / bmp.height);
    const w = bmp.width * scale;
    const h = bmp.height * scale;
    ctx.drawImage(bmp, (size - w) / 2, (size - h) / 2, w, h);
    setPhotos((p) => [...p, canvas.toDataURL("image/jpeg", 0.72)]);
  }

  function toggleHobby(h: string) {
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocStatus("Location not supported on this device.");
      return;
    }
    setLocStatus("Getting location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setLocStatus("Looking up area name…");
        try {
          // Free OpenStreetMap Nominatim reverse geocode (no API key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=12`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json();
            const a = data.address || {};
            const place =
              a.suburb ||
              a.neighbourhood ||
              a.city_district ||
              a.town ||
              a.city ||
              a.village ||
              a.county ||
              a.state ||
              "";
            const region = a.city || a.town || a.state || "";
            const label = [place, region].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
            if (label) {
              setArea(label);
              setLocStatus("Location detected and filled.");
            } else {
              setLocStatus("Location saved. Please type your area name.");
            }
          } else {
            setLocStatus("Location saved. Please type your area name.");
          }
        } catch {
          setLocStatus("Location saved. Please type your area name.");
        }
      },
      () => {
        setLocStatus("Could not get location. You can still type your area.");
        setLat(null);
        setLng(null);
      },
      { enableHighAccuracy: false, timeout: 12000 },
    );
  }

  const smokeDrinkOpts: { id: SmokeDrink; label: string }[] = [
    { id: "no", label: "No" },
    { id: "sometimes", label: "Sometimes" },
    { id: "yes", label: "Yes" },
    { id: "prefer_not", label: "Prefer not" },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-bg px-5 py-8">
      <div className="mb-4 rounded-2xl border border-border bg-surface px-3 py-2 text-xs text-muted">
        Finish setup to use the app, or <strong className="text-fg">Sign out</strong> (top right) to return to login.
        Admin access needs a completed profile with an admin email.
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm tracking-widest text-gold uppercase">Free setup</p>
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1.5 text-sm text-fg"
          onClick={() => {
            localSignOut();
            qc.clear();
            window.location.href = "/login";
          }}
        >
          Sign out
        </button>
      </div>
      <h1 className="font-display mt-2 text-4xl">Who are you?</h1>
      <p className="mt-2 text-xs text-muted">
        Woman accounts receive 250 welcome credits after setup to chat and stay active.
      </p>
      <p className="mt-2 text-muted">
        At least 3 photos, email, phone, and your area. Woman accounts can earn credits from chats and video.
      </p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (photos.length < 3) {
            setError("Add at least 3 photos.");
            return;
          }
          if (!email.trim() || !phone.trim()) {
            setError("Email and phone are required.");
            return;
          }
          if (!area.trim() || area.trim().length < 2) {
            setError("Please enter your city or area.");
            return;
          }
          save.mutate();
        }}
      >
        <div className="block">
          <span className="mb-2 block text-sm text-muted">Photos (min 3, max 6)</span>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface px-4 py-6 text-center transition hover:border-gold hover:bg-gold/5">
            <span className="text-2xl">📷</span>
            <span className="text-sm font-medium text-fg">
              {photos.length >= 6 ? "Maximum 6 photos reached" : "Tap to upload a photo"}
            </span>
            <span className="text-xs text-muted">JPG or PNG · square crop applied</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={photos.length >= 6}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
                e.target.value = "";
              }}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-24 w-24 rounded-2xl object-cover" />
                <button
                  type="button"
                  className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 text-xs text-primary-fg"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{photos.length}/3 minimum</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Name</span>
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Email (required)</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Phone (required)</span>
          <input
            type="tel"
            required
            placeholder="+91…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">Age</span>
          <input
            type="number"
            min={18}
            max={99}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>

        <fieldset>
          <legend className="mb-1 text-sm text-muted">I am</legend>
          <div className="flex flex-wrap gap-2">
            {(["woman", "man", "nonbinary"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`rounded-full px-4 py-2 text-sm ${gender === g ? "bg-primary text-primary-fg" : "bg-surface text-fg"}`}
              >
                {g}
              </button>
            ))}
          </div>
          {gender === "woman" ? (
            <p className="mt-2 text-xs text-gold">
              Woman accounts can earn credits from messages, gifts, and video — withdraw at 1000 credits ≈ $10.
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-muted">Looking for</legend>
          <div className="flex flex-wrap gap-2">
            {(["women", "men", "everyone"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSeeking(g)}
                className={`rounded-full px-4 py-2 text-sm ${seeking === g ? "bg-primary text-primary-fg" : "bg-surface text-fg"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-muted">Hobbies</legend>
          <div className="flex flex-wrap gap-2">
            {HOBBY_OPTIONS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => toggleHobby(h)}
                className={`rounded-full px-3 py-1.5 text-xs ${hobbies.includes(h) ? "bg-primary text-primary-fg" : "border border-border"}`}
              >
                {h}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-muted">Smoke?</legend>
          <div className="flex flex-wrap gap-2">
            {smokeDrinkOpts.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSmoke(o.id)}
                className={`rounded-full px-3 py-1.5 text-xs ${smoke === o.id ? "bg-primary text-primary-fg" : "border border-border"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-muted">Drink?</legend>
          <div className="flex flex-wrap gap-2">
            {smokeDrinkOpts.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setDrink(o.id)}
                className={`rounded-full px-3 py-1.5 text-xs ${drink === o.id ? "bg-primary text-primary-fg" : "border border-border"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-3xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-gold">Your area</p>
          <label className="block">
            <span className="mb-1 block text-sm text-muted">City or area name</span>
            <input
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Koramangala, Bangalore"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-2xl border border-border bg-bg px-4 py-3"
            />
          </label>
          <div>
            <span className="mb-2 block text-sm text-muted">Search radius</span>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r.km}
                  type="button"
                  onClick={() => setRadiusKm(r.km)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    radiusKm === r.km ? "bg-primary text-primary-fg" : "border border-border bg-bg text-fg"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={useMyLocation} className="w-full rounded-full border border-border py-2.5 text-sm">
            Use my current location (optional)
          </button>
          {locStatus ? <p className="text-xs text-muted">{locStatus}</p> : null}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm text-muted">A little about you</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
          />
        </label>

        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <button
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-fg"
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Enter RadiusMeet"}
        </button>
      </form>
    </main>
  );
}
