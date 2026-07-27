---
description: Worklist pajak dan pengingat batas setor di mobile
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu, lalu `KasTunai.gs` fungsi
`getNotaPajak()`, `_Config.gs` bagian `PAJAK_REF` / `PAJAK_DEFAULT`, dan di `mobile.html`:
`bukaPajak()`, `hitungPajakUI()`, `simpanPajak()`, `klasifikasiPajak()`.

Masalah: pengisian pajak di HP sudah bisa, tapi **reaktif** — bendahara harus ingat membuka
transaksi satu per satu. Tidak ada daftar "apa yang belum beres" dan tidak ada pengingat
batas setor. Ini satu-satunya area di aplikasi ini yang sanksinya menempel ke bendahara
secara pribadi.

**Catatan data yang menentukan:** `getNotaPajak()` sekarang hanya mengembalikan nota yang
pajaknya SUDAH dipotong (`if (pph + ppn <= 0) continue;`). Yang dibutuhkan justru
kebalikannya — nota yang **seharusnya** kena pajak tapi belum diisi.

**Berhenti dan tanya saya dulu** untuk dua hal sebelum menulis kode:
(a) bagaimana menentukan "seharusnya kena pajak" — kandidatnya klasifikasi otomatis dari
uraian (`klasifikasiPajak()` sudah ada) plus ambang nilai per kategori di `CONFIG.PAJAK_REF`;
(b) skema kolom baru untuk status setor. **Jangan menebak aturan pajak sendiri.**

Alur setelah kedua hal itu disepakati: `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Endpoint (atau perluasan yang sudah ada) yang mengembalikan tiga kelompok:
   (a) terindikasi kena pajak tapi belum diisi, (b) sudah dipotong tapi belum ditandai
   disetor, (c) sudah disetor. Bila kolom status setor / tanggal setor / NTPN belum ada di
   sheet `MULTI_NOTA`, tambahkan di `_Config.gs` dan tulis pengisiannya — tetap ES5,
   hormati pola `SoftDelete` dan `DeferredFlush`.
2. Layar "Pajak" di mobile: tiga kelompok di atas, tiap baris bisa langsung dibuka ke form
   pajak yang **sudah ada** (`bukaPajak`) tanpa lewat daftar transaksi.
3. Ringkasan setoran bulan berjalan: total PPh dan PPN, tanggal batas setor, status belum/
   sudah disetor. Tanggal batas ambil dari konstanta yang mudah disetel di **satu** tempat —
   jangan hardcode berserakan; sertakan komentar sumber aturannya.
4. Penanda mendesak di Beranda bila ada pajak belum disetor dan batas setor tinggal ≤ 3 hari.
5. Form penandaan setor: tanggal setor + NTPN/kode billing, bisa untuk beberapa nota sekaligus.

Batasan: uang dan pajak **bilangan bulat** — uji pembulatan secara eksplisit. Backend ES5,
tanpa library baru, Bahasa Indonesia, tap target 44px.

Verifikasi wajib: ambil minimal 5 nota nyata dari sheet, hitung manual PPh/PPN-nya,
bandingkan dengan keluaran aplikasi, **tampilkan tabel perbandingannya** sebelum menyatakan
selesai (`verification-before-completion`).

Selesai: commit `feat: worklist pajak dan pengingat batas setor`, lalu perbarui papan status
dan catatan keputusan (definisi "seharusnya kena pajak", kolom baru, tanggal batas) di
`docs/HANDOFF-MOBILE.md`.
