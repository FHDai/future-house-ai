"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export default function FacilitiesPage() {
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const loadFacilities = useCallback(async () => {
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

    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Tesisler yüklenemedi: ${error.message}`);
      setPageLoading(false);
      return;
    }

    setFacilities(data ?? []);
    setPageLoading(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFacilities();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadFacilities]);

  const handleAddFacility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Tesis adı zorunludur.");
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("facilities").insert({
      owner_id: user.id,
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
    });

    if (error) {
      setMessage(`Tesis eklenemedi: ${error.message}`);
      setSaving(false);
      return;
    }

    setName("");
    setAddress("");
    setCity("");
    setShowForm(false);
    setMessage("Tesis başarıyla eklendi.");
    setSaving(false);

    await loadFacilities();
  };

  const handleDeleteFacility = async (facilityId: string) => {
    const confirmed = window.confirm(
      "Bu tesisi silmek istediğine emin misin?"
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("facilities")
      .delete()
      .eq("id", facilityId);

    if (error) {
      setMessage(`Tesis silinemedi: ${error.message}`);
      return;
    }

    setFacilities((currentFacilities) =>
      currentFacilities.filter((facility) => facility.id !== facilityId)
    );

    setMessage("Tesis silindi.");
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">Tesisler yükleniyor...</p>
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
              Tesisler
            </h1>

            <p className="mt-3 max-w-2xl text-gray-400">
              Spor tesislerini, konumlarını ve bağlı sahalarını buradan yönet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((currentValue) => !currentValue);
              setMessage("");
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            {showForm ? "Formu Kapat" : "Yeni Tesis Ekle"}
          </button>
        </header>

        {message && (
          <div className="mt-6 rounded-xl border border-gray-800 bg-neutral-950 px-5 py-4 text-sm text-gray-300">
            {message}
          </div>
        )}

        {showForm && (
          <section className="mt-8 rounded-2xl border border-gray-800 bg-neutral-950 p-6">
            <div>
              <p className="text-sm text-gray-500">Yeni Kayıt</p>

              <h2 className="mt-2 text-2xl font-semibold">
                Tesis bilgilerini gir
              </h2>
            </div>

            <form
              onSubmit={handleAddFacility}
              className="mt-6 grid gap-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-300">
                  Tesis Adı
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Örnek: Future Sports Club"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Şehir
                </label>

                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="İstanbul"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Adres
                </label>

                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Maslak, Sarıyer"
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
                  {saving ? "Kaydediliyor..." : "Tesisi Kaydet"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-medium transition hover:border-white disabled:opacity-60"
                >
                  İptal
                </button>
              </div>
            </form>
          </section>
        )}

        {facilities.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Henüz tesis eklenmedi
            </h2>

            <p className="mt-3 text-gray-500">
              İlk tesisini ekleyerek SportOS kurulumuna başlayabilirsin.
            </p>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              İlk Tesisi Ekle
            </button>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {facilities.map((facility) => (
              <article
                key={facility.id}
                className="rounded-2xl border border-gray-800 bg-neutral-950 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Spor Tesisi
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      {facility.name}
                    </h2>
                  </div>

                  <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
                    Aktif
                  </span>
                </div>

                <div className="mt-6 space-y-3 border-t border-gray-800 pt-5 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Şehir</span>
                    <span className="text-right">
                      {facility.city || "Belirtilmedi"}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="text-gray-500">Adres</span>
                    <span className="max-w-52 text-right">
                      {facility.address || "Belirtilmedi"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Saha Sayısı</span>
                    <span>0</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteFacility(facility.id)}
                    className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium transition hover:border-red-400 hover:text-red-300"
                  >
                    Sil
                  </button>

                  <Link
                    href="/dashboard/courts"
                    className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-200"
                  >
                    Sahaları Gör
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
