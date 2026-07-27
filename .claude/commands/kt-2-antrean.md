---
description: Bangun antrean unggah offline (IndexedDB) untuk mobile.html
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` (temuan **T2**) lebih dulu. Pastikan tugas 1
sudah selesai — keduanya menyentuh penyimpanan lokal yang sama.

Konteks lapangan: bendahara belanja di pasar/toko Sorong dengan sinyal buruk, bisa mencatat
3–5 transaksi berturut-turut sebelum dapat sinyal lagi. Saat ini semuanya ditolak.

**Batasan yang tidak bisa dilanggar:** web app GAS berjalan di iframe sandbox — service
worker, PWA install, dan Background Sync API tidak bisa dipakai; jangan menulisnya.
Antrean harus di IndexedDB (localStorage 5 MB tidak cukup untuk foto), tanpa dependency
baru, dan pengiriman tetap lewat `serverTambahTransaksi` / `serverTambahNota` /
`serverUploadFotoNota` yang sudah ada.

Alur: `brainstorming` untuk mengunci spec → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Modul antrean di `mobile.html`: `simpan(item)`, `semua()`, `hapus(id)`,
   `tandaiGagal(id, pesan)`. Satu item = satu transaksi lengkap (data + array foto +
   flag tanda terima + nota).
2. `simpanSemua()` saat luring **memasukkan ke antrean**, bukan menolak: toast
   "Disimpan di antrean — akan terkirim otomatis saat ada sinyal", bersihkan form,
   kembali ke beranda.
3. Pengirim otomatis: jalan saat aplikasi dibuka, saat event `online`, dan saat tombol
   "Kirim sekarang" ditekan. **Serial**, satu transaksi pada satu waktu (GAS mudah kena
   kuota). Retry maksimal 3x per item lalu tandai GAGAL — jangan loop tak terbatas.
4. Layar Antrean menggantikan `belumSiap('Antrean unggah')` di `#nvAntrean`. Tiap baris:
   uraian, nilai, tanggal, jumlah foto, status (menunggu / mengirim / gagal + alasan),
   tombol Kirim sekarang, Ubah, Hapus. Badge jumlah antrean di ikon nav.
5. Chip "Draft offline" di layar Transaksi menampilkan isi antrean yang sama, bukan
   placeholder. Item antrean harus jelas beda tampilannya dari transaksi yang sudah
   tersimpan di server.
6. **Idempotensi (kritis, ini soal uang):** satu item tidak boleh dobel masuk sheet bila
   jaringan putus setelah server menyimpan tapi sebelum respons diterima. Rancang
   penangkalnya — mis. `clientId` unik per item yang dicek server sebelum membuat baris
   baru. Bila menuntut perubahan backend, tulis di `KasTunai.gs` / `_Config.gs` (tetap
   ES5, daftarkan kolom baru) dan **tanyakan dulu** sebelum mengubah skema sheet.
7. Banner `#bdOffline` dan label "Disimpan lokal" di layar kamera diarahkan ke layar Antrean.

Verifikasi wajib (`verification-before-completion`), tunjukkan hasilnya:

- Jaringan mati → catat 3 transaksi berfoto → semua masuk antrean, tetap ada setelah tab
  ditutup dan dibuka lagi.
- Jaringan hidup → ketiganya terkirim berurutan, antrean kosong, muncul di daftar transaksi.
- Jaringan putus di tengah pengiriman → item ditandai gagal, bisa dikirim ulang, **tidak dobel**.

Selesai: commit bertahap, lalu perbarui papan status dan catatan keputusan di
`docs/HANDOFF-MOBILE.md`.
