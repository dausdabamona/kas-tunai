# Desain: Kerangka Rail-Nav Desktop (Tugas 1, `docs/HANDOFF-DESKTOP.md`)

## Konteks

`index.html` (desktop) sekarang memakai navigasi tab horizontal di atas (`.tabs`, 6 tombol +
2 tombol admin, dirouting lewat `switchTab(tab)` di `index.html:1362-1379`), dengan design
system lama (`--c-primary`/`--c-head1`/`--c-head2`, font JetBrains Mono, biru/teal —
`index.html:11-15`). Paket desain baru (lihat `docs/HANDOFF-DESKTOP.md` Bagian II) meminta
navigasi rail di kiri (236px) memakai design system **Broadsheet** yang sama dengan
`mobile.html` (Source Serif 4, token `--ac`/`--a2`/dst.).

Tugas ini ("tugas 1" di papan status `docs/HANDOFF-DESKTOP.md` bagian 1) **hanya membangun
kerangka navigasinya** — bukan mendesain ulang isi tiap layar (itu tugas 2-6 tersendiri).

## Keputusan yang sudah disetujui pengguna (lewat `AskUserQuestion`/persetujuan langsung, 28 Jul 2026)

| Topik | Keputusan |
|---|---|
| Cakupan visual | **Kerangka saja.** Rail kiri + bar atas pakai token Broadsheet baru. Isi 6 layar yang sudah ada (`viewTransaksi`, `viewSpd`, `viewLaporan`, `viewPajak`, `viewDana`, `viewRekon`) **tidak diubah tampilannya** — cuma dipindah posisi ke bawah kerangka baru, direstyle di tugas 2-6 masing-masing. |
| Isi menu rail | **Persis 6 menu yang sudah ada sekarang** (Transaksi, Perjalanan Dinas, Laporan, Nota Kena Pajak, Ketersediaan Dana, Rekonsiliasi) — **TIDAK** ada "Papan kerja" atau "Pagu & realisasi" sebagai menu baru/placeholder. Dua nama itu baru masuk ke rail nanti, saat tugas 2 (Papan kerja) dan tugas 7-11 (Pagu & realisasi, GLP039) benar-benar selesai dikerjakan — bukan sekarang sebagai tempat kosong. Ini keputusan final setelah dua putaran diskusi (draf awal sempat mengusulkan placeholder "Segera hadir" dan pemetaan sementara ke `viewDana` — **kedua ide itu DIBATALKAN**, jangan diimplementasikan). |
| Layar default saat dibuka | **Transaksi** (sama seperti sekarang — `viewTransaksi` sudah `class="wrap"` tanpa `hidden`, tetap begitu). |
| Pendekatan teknis | **Ganti terarah** (bukan rombak `<body>` jadi CSS Grid): markup `.topbar`/`.tabs` lama diganti markup rail+bar-atas baru; 6 `<div id="view...">` yang sudah ada dipindah jadi anak dari kontainer konten baru, TIDAK diubah isinya; `switchTab()` dipertahankan bentuknya (per-ID individual, bukan data-driven loop) — mengikuti pola yang sudah dipakai kode ini, bukan pola `mobile.html`. |
| Tombol admin (Kelola User/Pengaturan) & Keluar | Pindah ke bagian bawah rail, fungsinya (termasuk syarat tampil untuk admin) tidak berubah. |

## Bagian 1 — Struktur HTML

Ganti blok ini di `index.html` (baris 257-277, `<header class="topbar">` sampai penutup
`<div class="tabs">`):

```html
<header class="topbar">
  <div class="brand">&#128176; <span>Kas Tunai<small>Poltek KP Sorong &middot; <span id="userLabel"></span></small></span></div>
  <div style="display:flex;align-items:center;gap:10px">
    <div class="saldo-pill"><div class="l">Saldo</div><div class="v" id="saldoPill">-</div></div>
    <button id="btnLogout" onclick="doLogout()" title="Keluar"
      style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:8px;padding:6px 11px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
      &#128275; Keluar
    </button>
  </div>
</header>

<div class="tabs">
  <button id="tabTransaksi" class="active" onclick="switchTab('transaksi')">&#128221; Transaksi</button>
  <button id="tabSpd" onclick="switchTab('spd')">&#9992; Perjalanan Dinas</button>
  <button id="tabLaporan" onclick="switchTab('laporan')">&#128202; Laporan</button>
  <button id="tabPajak" onclick="switchTab('pajak')">&#9881; Nota Kena Pajak</button>
  <button id="tabDana" onclick="switchTab('dana')">&#128200; Ketersediaan Dana</button>
  <button id="tabRekon" onclick="switchTab('rekon')">&#128260; Rekonsiliasi</button>
  <button id="btnUsers" class="hidden" onclick="openModalUsers()">&#128101; Kelola User</button>
  <button id="btnSettings" class="hidden" onclick="openModalSettings()">&#9881; Pengaturan</button>
</div>
```

Ganti dengan:

```html
<nav class="rail">
  <div class="rail-brand">Kas Tunai<small>Poltek KP Sorong &middot; <span id="userLabel"></span></small></div>
  <button id="tabTransaksi" class="rail-item active" onclick="switchTab('transaksi')">Transaksi</button>
  <button id="tabSpd" class="rail-item" onclick="switchTab('spd')">Perjalanan Dinas</button>
  <button id="tabLaporan" class="rail-item" onclick="switchTab('laporan')">Laporan</button>
  <button id="tabPajak" class="rail-item" onclick="switchTab('pajak')">Nota Kena Pajak</button>
  <button id="tabDana" class="rail-item" onclick="switchTab('dana')">Ketersediaan Dana</button>
  <button id="tabRekon" class="rail-item" onclick="switchTab('rekon')">Rekonsiliasi</button>
  <div class="rail-spacer"></div>
  <div class="rail-saldo"><div class="l">Saldo</div><div class="v" id="saldoPill">-</div></div>
  <button id="btnUsers" class="rail-item hidden" onclick="openModalUsers()">Kelola User</button>
  <button id="btnSettings" class="rail-item hidden" onclick="openModalSettings()">Pengaturan</button>
  <button id="btnLogout" class="rail-item" onclick="doLogout()">Keluar</button>
</nav>
<div class="app-main">
```

The 6 view containers do NOT appear in the same order as the rail menu, and this matters for
finding the correct insertion point. Actual current DOM order (verified by reading the file,
not assumed): `viewTransaksi` → `viewSpd` → `viewLaporan` → `viewRekon` → `viewPajak` →
**`viewDana` (last)** — followed immediately by a `<!-- ================= MODAL IMPOR PAGU
================= -->` comment starting the modals section. So the new wrapper's closing tag
goes immediately AFTER `viewDana`'s closing `</div>` (the one right before the "MODAL IMPOR
PAGU" comment), NOT after `viewRekon`:

```html
</div><!-- /.app-main -->
```

All 6 `<div id="view...">...</div>` blocks stay exactly where they are in the source, in their
existing DOM order (between the opened `<div class="app-main">` and its closing tag) — **do
not move, reorder, or re-copy their inner content**, only the wrapping tags around them
change. `id="mobileTip"` banner stays BEFORE `<nav class="rail">` (outside the new layout,
unchanged position and behavior). The modal `<div>` blocks (Impor Pagu, Pilih Jenis Transaksi,
Transaksi, etc.) that follow `viewDana` are OUTSIDE `.app-main` — modals are unaffected by this
task, leave their position relative to `.app-main`'s closing tag exactly as found.

**Menu labels drop their emoji prefixes** (📝, ✈️, 📊, ⚙️, 📈, 🔄) present in the old tab
buttons — the Broadsheet rail-nav style (see `mobile.html`'s bottom nav for reference) uses
plain text labels, not emoji. `id`s stay unchanged (`tabTransaksi` etc.) so `switchTab()`
needs no changes to its `document.getElementById(...)` calls.

## Bagian 2 — CSS

Add Broadsheet tokens **alongside** the existing `:root` block (`index.html:11-15`) — do NOT
remove or rename the existing `--c-*` tokens, since all 6 view screens' existing CSS still
references them (they get migrated individually in tasks 2-6, not here):

```css
:root{
  --c-primary:#1565c0; --c-head1:#16456e; --c-head2:#1d6299;
  --c-bg:#eef1f5; --c-card:#fff; --c-line:#e2e6ec;
  --c-text:#1f2937; --c-muted:#6b7280; --c-ok:#16a34a; --c-warn:#ea580c;
  --c-err:#dc2626; --c-purple:#7c3aed; --radius:12px;
  --c-teal:#0d9488; --c-teal-bg:#f0fdfa;
  /* Broadsheet (kerangka rail-nav baru — dipakai HANYA oleh .rail/.app-main di bawah,
     BUKAN oleh CSS layar lama, sampai tugas 2-6 merestyle layar masing-masing) */
  --bs-bg:#f3f2f2; --bs-ink:#201e1d; --bs-paper:#fff;
  --bs-ac:#0088b0; --bs-ac7:#006786; --bs-ac1:#e9f8ff;
  --bs-a2:#d6006c; --bs-n200:#eae7e7; --bs-n400:#bab6b6; --bs-n600:#7d7979; --bs-n700:#605d5d;
  --bs-fh:'Source Serif 4',Georgia,serif;
}
```

Add a `<link>` for the Source Serif 4 font in `<head>`, alongside the existing JetBrains Mono
link (`index.html:8`) — do not remove the JetBrains Mono link, screens 2-6 still use it until
restyled:

```html
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

New CSS rules (append after the existing `.tabs button.active{...}` rule, which stays in the
file even though unused by the new markup — removing genuinely-dead CSS is fine but not
required for this task; leaving it is harmless and lower-risk):

```css
body{display:flex;min-height:100vh;margin:0}
.rail{width:236px;flex:0 0 236px;background:var(--bs-n200);padding:24px 18px;display:flex;
  flex-direction:column;gap:4px;box-sizing:border-box}
.rail-brand{font-family:var(--bs-fh);font-size:22px;font-weight:600;color:var(--bs-ink);
  margin-bottom:18px}
.rail-brand small{display:block;font-size:12px;font-weight:400;color:var(--bs-n700);margin-top:2px}
.rail-item{min-height:42px;border:none;border-radius:999px;padding:0 16px;text-align:left;
  font-family:var(--bs-fh);font-size:14px;font-weight:600;background:none;color:var(--bs-ink);
  cursor:pointer}
.rail-item.active{background:var(--bs-ac);color:#fff}
.rail-item.hidden{display:none}
.rail-spacer{flex:1}
.rail-saldo{padding:10px 16px;font-family:var(--bs-fh)}
.rail-saldo .l{font-size:11px;color:var(--bs-n700)}
.rail-saldo .v{font-size:16px;font-weight:600;color:var(--bs-ink)}
.app-main{flex:1;min-width:0;overflow-y:auto}
```

`body{display:flex}` is the one necessarily-global change this task makes (needed so `.rail`
and `.app-main` sit side by side) — everything else is additive/scoped to the new classes.

The existing `.wrap{padding:14px;max-width:1180px;margin:0 auto}` rule (`index.html:37`)
centers each screen against the FULL viewport width, which no longer makes sense once a
236px rail sits to the left. Change it to fill the remaining column instead of the whole
viewport:

```css
.wrap{padding:14px;max-width:1180px;margin:0}
```

(Only `margin:0 auto` → `margin:0` changes; `max-width`/`padding` stay — this still caps
line-length on very wide monitors without re-centering against the wrong axis.)

## Bagian 3 — JavaScript

`switchTab(tab)` (`index.html:1362-1379`) needs NO logic changes — it already toggles by
element `id`, and all `id`s (`viewTransaksi`, `tabTransaksi`, etc.) are unchanged in the new
markup. Confirm this holds after Bagian 1's edit (i.e., don't accidentally rename any `id`
while rewriting the surrounding markup).

## Bagian 4 — Kasus tepi (tidak boleh regresi)

- `#btnUsers`/`#btnSettings` tetap `class="...hidden"` by default, hanya dimunculkan oleh kode
  yang sudah ada di tempat lain (cek existing logic yang menghapus kelas `hidden` untuk admin —
  tidak disentuh oleh tugas ini, cuma pastikan class `hidden` masih ada di markup baru).
- `#mobileTip` (banner "Layar Anda kecil") tetap di posisi sebelumnya (sebelum kerangka baru),
  perilakunya tidak tersentuh.
- `doLogout()`/`openModalUsers()`/`openModalSettings()` — panggilan `onclick` sama persis,
  tidak ada perubahan fungsi.
- Layar default saat load: `viewTransaksi` tetap `class="wrap"` (tanpa `hidden`), `tabTransaksi`
  tetap punya `class="rail-item active"` — tidak berubah dari kondisi sekarang, cuma nama
  kelasnya (`active` tab lama → `active` rail item baru, keduanya sudah dipakai `switchTab`).
- TIDAK ada layar/menu baru bernama "Papan kerja" atau "Pagu & realisasi" di scope ini —
  lihat tabel keputusan di atas. Jangan menambahkannya "supaya lengkap"; itu scope creep.

## Bagian 5 — Rencana uji

Wajib diuji lewat klik sungguhan di browser (bukan hanya panggil fungsi lewat kode), mengikuti
konvensi verifikasi proyek ini:

1. Muat halaman → `viewTransaksi` otomatis terlihat, `tabTransaksi` berkelas `active`, 5 layar
   lain tersembunyi.
2. Klik nyata satu-satu ke 6 tombol rail (`tabSpd`, `tabLaporan`, `tabPajak`, `tabDana`,
   `tabRekon`, lalu balik ke `tabTransaksi`) → tiap klik memunculkan layar yang cocok DAN
   menyembunyikan yang lain, kelas `active` berpindah ke tombol yang benar.
3. Data yang sudah dimuat di satu layar (mis. isi tabel `#listTransaksi`) tidak hilang/berubah
   saat berpindah ke layar lain dan kembali lagi (`switchTab` cuma toggle visibility, tidak
   membongkar DOM — pastikan ini tetap benar setelah restrukturisasi markup).
4. `#btnUsers`/`#btnSettings` tetap tersembunyi untuk akun bukan admin (stub data pengguna
   non-admin dalam skrip verifikasi, pastikan `classList`/`className` kedua tombol itu masih
   mengandung `hidden`).
5. Pemindaian `onclick`/`onchange` menyeluruh pada markup baru (pola yang sudah dipakai sesi
   ini di mobile) — pastikan tak ada atribut yang secara sintaks JS rusak setelah markup
   ditulis ulang.
6. Tidak ada teks "Papan kerja" atau "Pagu & realisasi" muncul di mana pun pada hasil render
   (memastikan scope creep dari draf sebelumnya benar-benar tidak kebawa).

## Status

Kelima bagian disetujui bertahap oleh pengguna (28 Jul 2026), termasuk satu revisi signifikan
di tengah jalan (pengguna menolak ide placeholder "Papan kerja"/"Pagu & realisasi" — dicabut
dari desain, dicatat eksplisit di atas supaya tidak terulang saat menulis rencana implementasi).
Langkah berikutnya: `writing-plans`.
