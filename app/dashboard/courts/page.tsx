"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  name: string;
};

type Court = {
  id: string;
  facility_id: string;
  name: string;
  sport_type: string;
  price_per_hour: number;
  is_active: boolean;
  created_at: string;
  facilities: {
    name: string;
  }[] | null;
};

export default function CourtsPage() {
  const router = useRouter();

  const [courts, setCourts] = useState<Court[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [facilityId, setFacilityId] = useState("");
  const [name, setName] = useState("");
  const [sportType, setSportType] = useState("Futbol");
  const [pricePerHour, setPricePerHour] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const loadPageData = async () => {
    setPageLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const [facilitiesResult, courtsResult] = await Promise.all([
      supabase
        .from("facilities")
        .select("id, name")
        .order("name", { ascending: true }),

      supabase
        .from("courts")
        .select(`
          id,
          facility_id,
          name,
          sport_type,
          price_per_hour,
          is_active,
          created_at,
          facilities (
            name
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (facilitiesResult.error) {
      setMessage(
        `Tesisler yüklenemedi: ${facilitiesResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    if (courtsResult.error) {
      setMessage(
        `Sahalar yüklenemedi: ${courtsResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    const facilityList = facilitiesResult.data ?? [];

    setFacilities(facilityList);
    setCourts((courtsResult.data ?? []) as Court[]);

    if (facilityList.length > 0) {
      setFacilityId((currentFacilityId) => {
        return currentFacilityId || facilityList[0].id;
      });
    }

    setPageLoading(false);
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const handleAddCourt = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");

    if (!facilityId) {
      setMessage("Önce bir tesis seçmelisin.");
      setMessageType("error");
      return;
    }

    if (!name.trim()) {
      setMessage("Saha adı zorunludur.");
      setMessageType("error");
      return;
    }

    const numericPrice = Number(pricePerHour);

    if (
      pricePerHour.trim() === "" ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      setMessage("Geçerli bir saatlik ücret gir.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("courts").insert({
      facility_id: facilityId,
      name: name.trim(),
      sport_type: sportType,
      price_per_hour: numericPrice,
      is_active: true,
    });

    if (error) {
      setMessage(`Saha eklenemedi: ${error.message}`);
      setMessageType("error");
      setSaving(false);
      return;
    }

    setName("");
    setSportType("Futbol");
    setPricePerHour("");
    setShowForm(false);
    setSaving(false);

    await loadPageData();

    setMessage("Saha başarıyla eklendi.");
    setMessageType("success");
  };

  const handleDeleteCourt = async (courtId: string) => {
    const confirmed = window.confirm(
      "Bu sahayı silmek istediğine emin misin?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("courts")
      .delete()
      .eq("id", courtId);

    if (error) {
      setMessage(`Saha silinemedi: ${error.message}`);
      setMessageType("error");
      return;
    }

    setCourts((currentCourts) =>
      currentCourts.filter((court) => court.id !== courtId)
    );

    setMessage("Saha başarıyla silindi.");
    setMessageType("success");
  };

  const handleToggleCourtStatus = async (court: Court) => {
    setMessage("");

    const { error } = await supabase
      .from("courts")
      .update({
        is_active: !court.is_active,
      })
      .eq("id", court.id);

    if (error) {
      setMessage(
        `Saha durumu güncellenemedi: ${error.message}`
      );
      setMessageType("error");
      return;
    }

    setCourts((currentCourts) =>
      currentCourts.map((currentCourt) =>
        currentCourt.id === court.id
          ? {
              ...currentCourt,
              is_active: !currentCourt.is_active,
            }
          : currentCourt
      )
    );

    setMessage(
      court.is_active
        ? "Saha pasif duruma alındı."
        : "Saha aktif duruma alındı."
    );
    setMessageType("success");
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">Sahalar yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-gray-800 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 transition hover:text-white"
            >
              ← Dashboard
            </Link>

            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-gray-500">
              SportOS
            </p>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Sahalar
            </h1>

            <p className="mt-3 max-w-2xl text-gray-400">
              Tesislerine bağlı sahaları, spor türlerini ve saatlik
              ücretlerini yönet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((currentValue) => !currentValue);
              setMessage("");
            }}
            disabled={facilities.length === 0}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Formu Kapat" : "Yeni Saha Ekle"}
          </button>
        </header>

        {message && (
          <div
            className={`mt-6 rounded-xl border px-5 py-4 text-sm ${
              messageType === "error"
                ? "border-red-900 bg-red-950/30 text-red-200"
                : "border-emerald-900 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            {message}
          </div>
        )}

        {facilities.length === 0 && (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Önce bir tesis eklemelisin
            </h2>

            <p className="mt-3 text-gray-500">
              Sahalar bir tesise bağlı olmak zorundadır.
            </p>

            <Link
              href="/dashboard/facilities"
              className="mt-6 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Tesislere Git
            </Link>
          </section>
        )}

        {showForm && facilities.length > 0 && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-neutral-950 p-6">
            <p className="text-sm text-gray-500">Yeni Kayıt</p>

            <h2 className="mt-2 text-2xl font-semibold">
              Saha bilgilerini gir
            </h2>

            <form
              onSubmit={handleAddCourt}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Tesis
                </label>

                <select
                  value={facilityId}
                  onChange={(event) =>
                    setFacilityId(event.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                >
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Saha Adı
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Örnek: Padel Kortu 1"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Spor Türü
                </label>

                <select
                  value={sportType}
                  onChange={(event) =>
                    setSportType(event.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                >
                  <option value="Futbol">Futbol</option>
                  <option value="Padel">Padel</option>
                  <option value="Tenis">Tenis</option>
                  <option value="Basketbol">Basketbol</option>
                  <option value="Voleybol">Voleybol</option>
                  <option value="Pickleball">Pickleball</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Saatlik Ücret
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerHour}
                  onChange={(event) =>
                    setPricePerHour(event.target.value)
                  }
                  placeholder="2500"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div className="flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Kaydediliyor..." : "Sahayı Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setMessage("");
                  }}
                  disabled={saving}
                  className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-medium transition hover:border-white disabled:opacity-60"
                >
                  İptal
                </button>
              </div>
            </form>
          </section>
        )}

        {facilities.length > 0 && courts.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Henüz saha eklenmedi
            </h2>

            <p className="mt-3 text-gray-500">
              İlk sahanı ekleyerek rezervasyon altyapısını
              hazırlayabilirsin.
            </p>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              İlk Sahayı Ekle
            </button>
          </section>
        ) : (
          courts.length > 0 && (
            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {courts.map((court) => (
                <article
                  key={court.id}
                  className="rounded-2xl border border-gray-800 bg-neutral-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {court.facilities?.[0]?.name || "Tesis"}
                      </p>

                      <h2 className="mt-2 text-xl font-semibold">
                        {court.name}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        court.is_active
                          ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                          : "border-gray-700 bg-gray-900 text-gray-400"
                      }`}
                    >
                      {court.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-gray-800 pt-5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">
                        Spor Türü
                      </span>

                      <span>{court.sport_type}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">
                        Saatlik Ücret
                      </span>

                      <span>
                        {Number(
                          court.price_per_hour
                        ).toLocaleString("tr-TR")}{" "}
                        TL
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleCourtStatus(court)}
                      className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium transition hover:border-white"
                    >
                      {court.is_active
                        ? "Pasife Al"
                        : "Aktif Et"}
                    </button>

                    <Link
                      href="/dashboard/reservations"
                      className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-200"
                    >
                      Takvimi Gör
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourt(court.id)}
                      className="rounded-xl border border-red-900 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950 sm:col-span-2"
                    >
                      Sahayı Sil
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )
        )}
      </div>
    </main>
  );
}