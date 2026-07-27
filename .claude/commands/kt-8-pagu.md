---
description: Pilih item POK dan tampilkan sisa pagu saat mencatat dari HP
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu, lalu `Anggaran.gs` seluruhnya,
`KasTunai.gs` bagian tambah/update transaksi, layar `#scCatat` di `mobile.html`, dan pola
`#txItem` + `_cariItem()` di `index.html` (desktop sudah punya pemilih item POK).

Dua masalah sekaligus:

**(A) Cacat data.** `Anggaran.ketersediaan()` menghitung serapan lewat kolom `KODE_ITEM`,
tapi form catat di HP hanya punya field teks bebas "Akun / MAK" (`#ctAkun`) dan
`simpanSemua()` **tidak pernah mengirim `kodeItem`**. Semua transaksi dari HP jatuh ke
`belanjaTanpaItem` dan tidak mengurangi pagu item mana pun.

**(B) Fitur hilang.** Keputusan "boleh belanja atau tidak" terjadi di toko, bukan di meja.

Alur: `brainstorming` → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Ganti `#ctAkun` dengan **pemilih item POK** yang mencari ke `serverKetersediaanDana(token)`
   (bentuk datanya ada di bagian 6 handoff). Hasil pencarian menampilkan uraian item +
   akun + sisa aman dalam rupiah.
2. Akun/MAK **terisi otomatis** dari item terpilih, tetap terlihat pengguna.
3. Sisa pagu inline di bawah pemilih, **dihitung ulang saat nilai diketik**: "Sisa aman
   Rp 12.450.000 → setelah transaksi ini Rp 9.950.000". Melebihi pagu: merah + peringatan.
   **Jangan blokir penyimpanan**, tapi wajibkan konfirmasi sadar.
4. `simpanSemua()` dan alur edit **harus mengirim `kodeItem` dan `uraianItem`**.
5. Cache daftar item di perangkat, tandai bila angka berasal dari cache dan sebutkan kapan
   diperbarui. Bila tugas 6 sudah ada, **item antrean yang belum terkirim ikut dikurangkan**
   dari sisa aman.

Batasan: backend ES5. **Jangan ubah rumus `sisaAman` di `Anggaran.gs`** — hanya konsumsi.

Verifikasi: catat satu transaksi dari HP dengan item POK terpilih, lalu buka tab
"Ketersediaan Dana" di desktop — belanja itu mengurangi item yang benar dan
`belanjaTanpaItem` **tidak** bertambah. Tunjukkan buktinya.

Sebutkan di ringkasan akhir: setelah tugas ini angka Ketersediaan Dana di desktop akhirnya
memasukkan belanja dari HP. Bila angkanya berubah, itu koreksi, bukan bug.

Selesai: commit `feat: pilih item POK dan tampilkan sisa pagu saat mencatat dari HP`,
perbarui papan status di `docs/HANDOFF-MOBILE.md`.
