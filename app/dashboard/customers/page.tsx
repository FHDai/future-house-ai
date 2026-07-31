"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ReservationSummary = {
  id: string;
  customer_id: string | null;
  reservation_date: string;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
};

type CustomerForm = {
  fullName: string;
  phone: string;
  email: string;
  notes: string;
};

type CustomerStats = {
  reservationCount: number;
  totalSpent: number;
  cancellationCount: number;
  lastVisit: string | null;
};

const initialForm: CustomerForm = {
  fullName: "",
  phone: "",
  email: "",
  notes: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return "Henüz ziyaret yok";
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeSearchValue(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<
    ReservationSummary[]
  >([]);

  const [form, setForm] = useState<CustomerForm>(initialForm);
  const [editingCustomerId, setEditingCustomerId] = useState<
    string | null
  >(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<
    string | null
  >(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const loadPageData = useCallback(async () => {
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

    const [customersResult, reservationsResult] =
      await Promise.all([
        supabase
          .from("customers")
          .select(`
            id,
            owner_id,
            full_name,
            phone,
            email,
            notes,
            created_at,
            updated_at
          `)
          .order("created_at", { ascending: false }),

        supabase
          .from("reservations")
          .select(`
            id,
            customer_id,
            reservation_date,
            total_price,
            status,
            payment_status
          `)
          .not("customer_id", "is", null)
          .order("reservation_date", { ascending: false }),
      ]);

    if (customersResult.error) {
      setMessage(
        `Müşteriler yüklenemedi: ${customersResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    if (reservationsResult.error) {
      setMessage(
        `Rezervasyon özetleri yüklenemedi: ${reservationsResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    setCustomers((customersResult.data ?? []) as Customer[]);

    setReservations(
      (reservationsResult.data ?? []) as ReservationSummary[]
    );

    setPageLoading(false);
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPageData]);

  const customerStats = useMemo(() => {
    const statsMap = new Map<string, CustomerStats>();

    customers.forEach((customer) => {
      statsMap.set(customer.id, {
        reservationCount: 0,
        totalSpent: 0,
        cancellationCount: 0,
        lastVisit: null,
      });
    });

    reservations.forEach((reservation) => {
      if (!reservation.customer_id) {
        return;
      }

      const currentStats = statsMap.get(
        reservation.customer_id
      );

      if (!currentStats) {
        return;
      }

      currentStats.reservationCount += 1;

      if (reservation.status === "cancelled") {
        currentStats.cancellationCount += 1;
      } else {
        currentStats.totalSpent += Number(
          reservation.total_price
        );
      }

      if (
        !currentStats.lastVisit ||
        reservation.reservation_date >
          currentStats.lastVisit
      ) {
        currentStats.lastVisit =
          reservation.reservation_date;
      }
    });

    return statsMap;
  }, [customers, reservations]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(searchTerm);

    if (!normalizedSearch) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableText = normalizeSearchValue(
        [
          customer.full_name,
          customer.phone ?? "",
          customer.email ?? "",
          customer.notes ?? "",
        ].join(" ")
      );

      return searchableText.includes(normalizedSearch);
    });
  }, [customers, searchTerm]);

  const totalCustomerRevenue = useMemo(() => {
    return reservations
      .filter(
        (reservation) =>
          reservation.status !== "cancelled"
      )
      .reduce(
        (total, reservation) =>
          total + Number(reservation.total_price),
        0
      );
  }, [reservations]);

  const returningCustomerCount = useMemo(() => {
    return customers.filter((customer) => {
      const stats = customerStats.get(customer.id);

      return (stats?.reservationCount ?? 0) > 1;
    }).length;
  }, [customers, customerStats]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingCustomerId(null);
    setShowForm(false);
  };

  const openNewCustomerForm = () => {
    setForm(initialForm);
    setEditingCustomerId(null);
    setMessage("");
    setShowForm(true);
  };

  const openEditCustomerForm = (customer: Customer) => {
    setForm({
      fullName: customer.full_name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      notes: customer.notes ?? "",
    });

    setEditingCustomerId(customer.id);
    setMessage("");
    setShowForm(true);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");

    if (!form.fullName.trim()) {
      setMessage("Müşteri adı ve soyadı zorunludur.");
      setMessageType("error");
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();

    if (
      normalizedEmail &&
      !normalizedEmail.includes("@")
    ) {
      setMessage("Geçerli bir e-posta adresi gir.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    if (editingCustomerId) {
      const { error } = await supabase
        .from("customers")
        .update({
          full_name: form.fullName.trim(),
          phone: form.phone.trim() || null,
          email: normalizedEmail || null,
          notes: form.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCustomerId);

      if (error) {
        const isDuplicatePhone =
          error.code === "23505";

        setMessage(
          isDuplicatePhone
            ? "Bu telefon numarasıyla kayıtlı başka bir müşteri bulunuyor."
            : `Müşteri güncellenemedi: ${error.message}`
        );

        setMessageType("error");
        setSaving(false);
        return;
      }

      setSaving(false);
      resetForm();
      await loadPageData();

      setMessage("Müşteri başarıyla güncellendi.");
      setMessageType("success");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from("customers")
      .insert({
        owner_id: user.id,
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        email: normalizedEmail || null,
        notes: form.notes.trim() || null,
      });

    if (error) {
      const isDuplicatePhone = error.code === "23505";

      setMessage(
        isDuplicatePhone
          ? "Bu telefon numarasıyla kayıtlı bir müşteri zaten bulunuyor."
          : `Müşteri oluşturulamadı: ${error.message}`
      );

      setMessageType("error");
      setSaving(false);
      return;
    }

    setSaving(false);
    resetForm();
    await loadPageData();

    setMessage("Müşteri başarıyla oluşturuldu.");
    setMessageType("success");
  };

  const handleDeleteCustomer = async (
    customer: Customer
  ) => {
    const stats = customerStats.get(customer.id);
    const reservationCount =
      stats?.reservationCount ?? 0;

    const confirmationMessage =
      reservationCount > 0
        ? `${customer.full_name} adlı müşterinin ${reservationCount} rezervasyonu bulunuyor. Müşteri silinirse rezervasyonlar silinmez ancak müşteri bağlantısı kaldırılır. Devam etmek istediğine emin misin?`
        : `${customer.full_name} adlı müşteriyi silmek istediğine emin misin?`;

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) {
      return;
    }

    setDeletingCustomerId(customer.id);
    setMessage("");

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id);

    if (error) {
      setMessage(`Müşteri silinemedi: ${error.message}`);
      setMessageType("error");
      setDeletingCustomerId(null);
      return;
    }

    setCustomers((currentCustomers) =>
      currentCustomers.filter(
        (currentCustomer) =>
          currentCustomer.id !== customer.id
      )
    );

    setReservations((currentReservations) =>
      currentReservations.filter(
        (reservation) =>
          reservation.customer_id !== customer.id
      )
    );

    setDeletingCustomerId(null);
    setMessage("Müşteri başarıyla silindi.");
    setMessageType("success");
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">
          Müşteriler yükleniyor...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 border-b border-gray-800 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 transition hover:text-white"
            >
              ← Dashboard
            </Link>

            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-gray-500">
              SportOS CRM
            </p>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Müşteriler
            </h1>

            <p className="mt-3 max-w-2xl text-gray-400">
              Müşteri bilgilerini, rezervasyon geçmişini ve
              toplam harcamalarını tek ekrandan yönet.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewCustomerForm}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            Yeni Müşteri
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <p className="text-sm text-gray-500">
              Toplam Müşteri
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {customers.length}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <p className="text-sm text-gray-500">
              Tekrar Gelen
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {returningCustomerCount}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <p className="text-sm text-gray-500">
              Bağlı Rezervasyon
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {reservations.length}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <p className="text-sm text-gray-500">
              Müşteri Cirosu
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {formatCurrency(totalCustomerRevenue)}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-800 bg-neutral-950 p-4 md:p-5">
          <label
            htmlFor="customer-search"
            className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500"
          >
            Müşteri Ara
          </label>

          <input
            id="customer-search"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Ad, telefon, e-posta veya not ara..."
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white"
          />
        </section>

        {customers.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Henüz müşteri bulunmuyor
            </h2>

            <p className="mt-3 text-gray-500">
              İlk müşterini ekleyerek SportOS CRM altyapısını
              kullanmaya başlayabilirsin.
            </p>

            <button
              type="button"
              onClick={openNewCustomerForm}
              className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              İlk Müşteriyi Ekle
            </button>
          </section>
        ) : filteredCustomers.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Aramana uygun müşteri bulunamadı
            </h2>

            <p className="mt-3 text-gray-500">
              Farklı bir isim, telefon veya e-posta
              arayabilirsin.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            {filteredCustomers.map((customer) => {
              const stats = customerStats.get(customer.id) ?? {
                reservationCount: 0,
                totalSpent: 0,
                cancellationCount: 0,
                lastVisit: null,
              };

              return (
                <article
                  key={customer.id}
                  className="rounded-2xl border border-gray-800 bg-neutral-950 p-5 md:p-6"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-semibold text-black">
                        {customer.full_name
                          .trim()
                          .charAt(0)
                          .toLocaleUpperCase("tr-TR")}
                      </div>

                      <h2 className="mt-4 truncate text-xl font-semibold">
                        {customer.full_name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {customer.phone || "Telefon belirtilmedi"}
                      </p>

                      {customer.email && (
                        <p className="mt-1 truncate text-sm text-gray-500">
                          {customer.email}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
                      {stats.reservationCount > 1
                        ? "Tekrar Gelen"
                        : stats.reservationCount === 1
                          ? "Yeni Müşteri"
                          : "Rezervasyonsuz"}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-800 bg-black p-4">
                      <p className="text-xs text-gray-500">
                        Rezervasyon
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {stats.reservationCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-black p-4">
                      <p className="text-xs text-gray-500">
                        Toplam Harcama
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(stats.totalSpent)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-black p-4">
                      <p className="text-xs text-gray-500">
                        Son Ziyaret
                      </p>

                      <p className="mt-2 text-sm font-medium">
                        {formatDate(stats.lastVisit)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-black p-4">
                      <p className="text-xs text-gray-500">
                        İptal
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {stats.cancellationCount}
                      </p>
                    </div>
                  </div>

                  {customer.notes && (
                    <div className="mt-4 rounded-xl border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-600">
                        Not
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                        {customer.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openEditCustomerForm(customer)
                      }
                      className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium transition hover:border-white"
                    >
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteCustomer(customer)
                      }
                      disabled={
                        deletingCustomerId === customer.id
                      }
                      className="rounded-xl border border-red-900 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingCustomerId === customer.id
                        ? "Siliniyor..."
                        : "Sil"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-gray-800 bg-neutral-950 p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  {editingCustomerId
                    ? "Müşteri Düzenle"
                    : "Yeni Müşteri"}
                </p>

                <h2 className="mt-3 text-2xl font-semibold">
                  Müşteri bilgileri
                </h2>
              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white disabled:opacity-50"
              >
                Kapat
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Ad Soyad
                </label>

                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="Örnek: Ali Yılmaz"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Telefon
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="05XX XXX XX XX"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  E-posta
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      email: event.target.value,
                    }))
                  }
                  placeholder="ali@example.com"
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Notlar
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Tercihleri, özel talepleri veya müşteriyle ilgili notlar..."
                  rows={4}
                  disabled={saving}
                  className="w-full resize-none rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none transition focus:border-white disabled:opacity-60"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-medium transition hover:border-white disabled:opacity-60"
                >
                  Vazgeç
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Kaydediliyor..."
                    : editingCustomerId
                      ? "Değişiklikleri Kaydet"
                      : "Müşteriyi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
