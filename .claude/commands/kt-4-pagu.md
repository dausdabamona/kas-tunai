---
description: Pilih item POK dan tampilkan sisa pagu saat mencatat dari HP
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` (temuan **T3**) lebih dulu, lalu
`Anggaran.gs` seluruhnya, `KasTunai.gs` bagian tambah/update transaksi, layar `#scCatat`
di `mobile.html`, dan pola `#txItem` + `_cariItem()` di `index.html`.

Tugas ini menyelesaikan **dua hal sekaligus**:

- **Cacat data (T3):** transaksi dari HP tidak pernah mengirim `kodeItem`, jadi jatuh ke
  `belanjaTanpaItem` dan tidak mengurangi pagu item mana pun.
- **Fitur hilang:** keputusan "boleh belanja atau tidak" terjadi di toko, bukan di meja
  kantor. Sisa pagu harus terlihat **sebelum** uang keluar.

Alur: `brainstorming` untuk mengunci perilaku pencarian dan aturan konfirmasi melebihi
pagu → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Ganti field teks bebas `#ctAkun` dengan **pemilih item POK** yang mencari ke daftar dari
   `serverKetersediaanDana(token)` (sudah ada — lihat bagian 3 handoff untuk bentuk datanya).
   Pencarian harus enak di layar kecil: ketik potongan uraian atau kode, hasil menampilkan
   uraian item + akun + sisa aman dalam rupiah.
2. Akun/MAK **terisi otomatis** dari item terpilih (tidak diketik manual lagi), tapi tetap
   terlihat pengguna.
3. Sisa pagu tampil inline di bawah pemilih dan **dihitung ulang saat nilai diketik**:
   "Sisa aman Rp 12.450.000 → setelah transaksi ini Rp 9.950.000". Bila melebihi pagu:
   merah, peringatan tegas. **Jangan blokir penyimpanan** — bendahara kadang memang harus
   mencatat dulu — tapi wajibkan konfirmasi sadar.
4. `simpanSemua()` dan alur edit (`bukaEdit` / `simpanEdit`) **harus mengirim `kodeItem`
   dan `uraianItem`**. Pastikan `KasTunai.gs` menyimpannya (kolom `KODE_ITEM` sudah ada).
5. Cache daftar item di perangkat supaya terbaca saat sinyal jelek; tandai jelas bila angka
   berasal dari cache dan sebutkan kapan terakhir diperbarui. Bila tugas 2 (antrean) sudah
   ada, **item antrean yang belum terkirim ikut dikurangkan** dari sisa aman — jangan sampai
   pagu yang sama dibelanjakan dua kali karena transaksinya belum terkirim.

Batasan: backend tetap ES5. **Jangan ubah rumus `sisaAman` di `Anggaran.gs`** — hanya
konsumsi. Tanpa library baru, Bahasa Indonesia, tap target 44px.

Verifikasi wajib: catat satu transaksi dari HP dengan item POK terpilih, lalu buka tab
"Ketersediaan Dana" di desktop — belanja itu harus muncul mengurangi item yang benar dan
`belanjaTanpaItem` **tidak** bertambah. Tunjukkan buktinya.

Catatan efek samping yang harus disebut di ringkasan akhir: setelah tugas ini, angka
Ketersediaan Dana di desktop akhirnya memasukkan belanja dari HP. Bila angkanya berubah,
itu koreksi, bukan bug.

Selesai: commit `feat: pilih item POK dan tampilkan sisa pagu saat mencatat dari HP`, lalu
perbarui papan status dan catatan keputusan di `docs/HANDOFF-MOBILE.md`.
