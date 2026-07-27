---
description: Antrean unggah offline (IndexedDB) untuk mobile.html
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu. Tugas 1 harus sudah selesai
(keduanya menyentuh penyimpanan lokal yang sama). Idealnya tugas 2–5 juga sudah beres,
supaya antrean langsung mencakup aksi kelola transaksi.

Konteks lapangan: bendahara belanja di pasar/toko Sorong dengan sinyal buruk, bisa
mencatat 3–5 transaksi berturut-turut sebelum dapat sinyal. Sekarang semuanya ditolak —
`simpanSemua()` saat `!navigator.onLine` hanya memberi pesan, dan hanya ada satu slot
draft (`kt_draft`) yang akan tertimpa transaksi berikutnya. `#nvAntrean` masih
`belumSiap()`, chip "Draft offline" masih placeholder.

**Batasan yang tidak bisa dilanggar:** web app GAS berjalan di iframe sandbox — service
worker, PWA install, dan Background Sync API tidak bisa dipakai; jangan menulisnya.
Antrean di IndexedDB (localStorage 5 MB tidak cukup untuk foto), tanpa dependency baru,
pengiriman tetap lewat endpoint `server*` yang sudah ada.

Alur: `brainstorming` → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Modul antrean di `mobile.html`: `simpan(item)`, `semua()`, `hapus(id)`,
   `tandaiGagal(id, pesan)`. Satu item = satu aksi lengkap (transaksi baru + foto + nota,
   atau nota susulan, atau pengembalian).
2. `simpanSemua()` saat luring **memasukkan ke antrean**, bukan menolak.
3. Pengirim otomatis: saat aplikasi dibuka, saat event `online`, dan saat tombol "Kirim
   sekarang". **Serial** (GAS mudah kena kuota), retry maksimal 3x lalu tandai GAGAL.
4. Layar Antrean menggantikan `belumSiap('Antrean unggah')`. Tiap baris: uraian, nilai,
   tanggal, jumlah foto, status, tombol Kirim sekarang / Ubah / Hapus. Badge jumlah di nav.
5. Chip "Draft offline" di layar Transaksi menampilkan isi antrean, dengan tampilan yang
   jelas berbeda dari transaksi yang sudah tersimpan di server.
6. **Idempotensi (kritis):** satu item tidak boleh dobel masuk sheet bila jaringan putus
   setelah server menyimpan tapi sebelum respons diterima. Rancang penangkalnya — mis.
   `clientId` unik yang dicek server sebelum membuat baris. Bila menuntut kolom baru,
   **tanyakan dulu**.
7. Banner `#bdOffline` dan label "Disimpan lokal" diarahkan ke layar Antrean.

Verifikasi wajib, tunjukkan hasilnya: (a) jaringan mati → 3 transaksi berfoto masuk antrean
dan bertahan setelah tab ditutup; (b) jaringan hidup → terkirim berurutan, muncul di daftar
transaksi; (c) putus di tengah kirim → ditandai gagal, bisa diulang, **tidak dobel**.

Selesai: commit bertahap, perbarui papan status di `docs/HANDOFF-MOBILE.md`.
