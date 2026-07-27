---
description: Worklist pajak lintas transaksi dan pengingat batas setor
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu. **Tugas 4 harus sudah selesai** —
mode bayar per nota dan nilai pajak tersimpan adalah bahan baku tugas ini. Lalu baca
`KasTunai.gs` fungsi `getNotaPajak()`, `_Config.gs` bagian `PAJAK_REF`, dan layar pajak di
`mobile.html`.

Tugas 4 mengurus pajak **satu nota**. Tugas ini mengurus kewajiban setor **lintas
transaksi** — daftar apa yang belum beres dan kapan batas waktunya. Ini satu-satunya area
di aplikasi yang sanksinya menempel ke bendahara secara pribadi.

Catatan data: `getNotaPajak()` sekarang hanya mengembalikan nota yang pajaknya **sudah**
dipotong (`if (pph + ppn <= 0) continue;`). Yang dibutuhkan justru juga kebalikannya.

**Berhenti dan tanya saya dulu** untuk: (a) cara menentukan "seharusnya kena pajak"
(kandidat: `klasifikasiPajak()` + ambang nilai per kategori di `CONFIG.PAJAK_REF`);
(b) tanggal batas setor yang berlaku untuk tiap jenis pajak. **Jangan menebak aturan pajak
sendiri.**

Alur setelah keduanya disepakati: `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. Data tiga kelompok: (a) terindikasi kena pajak tapi belum diisi, (b) sudah dipotong
   belum disetor, (c) sudah disetor. Kelompok (b) dipisah lagi: uangnya **sudah ditarik**
   (mode NETTO) versus **dari sumber lain** (mode BRUTO) — bendahara perlu tahu mana yang
   uangnya sudah ada di tangan. Kolom status setor / tanggal setor / NTPN ditambahkan di
   `_Config.gs` bila belum ada.
2. Layar "Pajak" lintas transaksi: tiga kelompok, tiap baris langsung membuka form pajak
   nota yang sudah ada (`bukaPajak`).
3. Ringkasan setoran bulan berjalan: total PPh dan PPN, tanggal batas, status. Tanggal batas
   dari konstanta di **satu** tempat, dengan komentar sumber aturannya.
4. Penanda mendesak di Beranda bila ada pajak belum disetor dan batas tinggal ≤ 3 hari.
5. Form penandaan setor: tanggal + NTPN/kode billing, bisa untuk beberapa nota sekaligus.

Batasan: uang dan pajak **bilangan bulat**, uji pembulatan eksplisit. Backend ES5, tanpa
library baru, Bahasa Indonesia.

Verifikasi: ambil minimal 5 nota nyata, hitung manual, bandingkan dengan keluaran aplikasi,
**tampilkan tabel perbandingannya** sebelum menyatakan selesai.

Selesai: commit `feat: worklist pajak lintas transaksi dan pengingat batas setor`, perbarui
papan status dan catatan keputusan di `docs/HANDOFF-MOBILE.md`.
