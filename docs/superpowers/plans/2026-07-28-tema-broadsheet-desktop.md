# Tema Broadsheet Desktop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti bahasa visual `index.html` dari palet lama (`--c-*`, 7 warna status) ke design system Broadsheet (`--bs-*`, 3 warna), plus kerangka v2: bar atas, penamaan & urutan menu, breakpoint rail.

**Architecture:** Konversi mekanis warna→token dengan tabel pemetaan tunggal. Langkah 1 mengonversi blok CSS bersama (59% warna) sekaligus kerangka; langkah 2-7 membereskan sisa per layar; langkah 8 menghapus `--c-*` sebagai bukti objektif konversi tuntas.

**Tech Stack:** HTML/CSS/vanilla JS satu berkas (`index.html`), tanpa build step. Verifikasi: Playwright klik nyata + tangkapan layar.

## Global Constraints

- **Hanya `index.html` yang disentuh.** Tidak ada `.gs`, tidak ada `mobile.html`, tidak ada endpoint, tidak ada perubahan skema sheet.
- **Ini konversi bahasa visual, BUKAN perubahan struktur.** Dilarang mengubah susunan elemen, memindahkan tombol, mengganti tata letak, atau mengubah teks — kecuali yang disebut eksplisit di Task 1 (bar atas & penamaan menu). Layar Transaksi tetap dua kolom kartu.
- **Dilarang mengubah JS di luar yang disebut eksplisit.** Warna di dalam string markup JS diganti, logikanya tidak.
- **Dokumen cetak tidak disentuh sama sekali.** Fungsi yang merakit HTML lengkap (`<html>`/`<head>` sendiri, dibuka lewat `_bukaPopup`) — mis. `_renderKuitansiPajakHtml`, `cetakSPJ`, `cetakSSP`, `cetakDana` — beserta blok `<style>` di dalamnya: **jangan diubah satu byte pun.**
- **Nilai `--c-*` di `:root` tidak diubah sampai Task 8.**
- **Empat kait `_applyRoleUI()` wajib bertahan persis namanya** — semuanya kontrol akses yang gagal secara senyap (tidak ada error, fiturnya cuma diam-diam terbuka untuk yang tidak berhak):
  - kelas `.saldo-pill` dan `.saldo-sum` pada elemen saldo → disembunyikan dari peran `viewer`
  - `id="btnUsers"` dan `id="btnSettings"` → hanya tampil untuk admin
  Baca `_applyRoleUI()` di `index.html` sebelum menyentuh markup rail, dan pastikan keempatnya masih ditemukan sesudahnya.
- **`#mobileTip` wajib tetap `flex:0 0 100%`** dan `body` tetap `flex-wrap:wrap`. Tanpa itu banner meremas konten jadi selebar 0px.
- **Rail wajib tetap lengket**: `position:sticky; top:0; align-self:flex-start; max-height:100vh; overflow-y:auto`. **Jangan** menjadikan `.app-main` wadah gulir — merusak `window.scrollTo(0,0)`.
- **Warna di luar tabel pemetaan tidak boleh ditebak.** Bila menemukan hex yang tidak ada di tabel, **hentikan dan laporkan** dengan nomor barisnya. Jangan memilih token yang "kira-kira cocok".
- **Bahasa UI Indonesia.** Target sentuh minimal 44px untuk tombol, 42px untuk pil menu rail.
- **Commit:** Conventional Commits, subjek Bahasa Indonesia, imperatif, < 72 karakter.

**Spec:** `docs/superpowers/specs/2026-07-28-tema-broadsheet-desktop-design.md`
**Acuan visual:** `docs/HANDOFF-DESKTOP.md` bagian 3b dan 6.

---

## Tabel pemetaan warna — SUMBER KEBENARAN

Dipakai oleh **semua** task. Ganti nilai hex dengan `var(--token)`.

| Token | Nilai | Hex lama yang dipetakan ke sini |
|---|---|---|
| `--bs-paper` | `#fff` | `#fff` `#ffffff` `#fbfcfd` `#fafbfc` `#f8fafc` `#f0f0f0` |
| `--bs-bg` | `#f3f2f2` | `#eef1f5` `#eef2f7` `#f0efee` `#efeeed` `#f3f2f2` |
| `--bs-ink` | `#201e1d` | `#000` `#000000` `#201e1d` |
| `--bs-ac` | `#0088b0` | `#0f766e` `#0d9488` `#1565c0` `#2563eb` `#0891b2` `#0088b0` |
| `--bs-ac7` | `#006786` | `#16456e` `#1d6299` `#123a5e` `#1f3a5f` `#0369a1` `#006786` `#006688` |
| `--bs-ac6` | `#0077a0` | *(baru — hover/pressed tombol accent)* |
| `--bs-ac3` | `#99e0ff` | `#99f6e4` `#bae6fd` |
| `--bs-ac1` | `#e9f8ff` | `#f0fdfa` `#f0f9ff` `#e6f4f8` `#eff6ff` `#e9f8ff` |
| `--bs-a2` | `#d6006c` | `#dc2626` `#991b1b` `#9a3412` `#be123c` `#ea580c` `#ea7317` `#b45309` `#854d0e` `#db2777` `#d6006c` |
| `--bs-a21` | `#fff1f4` | `#fee2e2` `#fff7ed` `#fff0f0` `#ffd1d1` `#fef2f2` `#fecaca` `#ffedd5` `#fed7aa` `#fdecdf` `#fef9c3` `#fffbeb` `#fde68a` `#fdba74` `#fca5a5` `#f6c343` `#fbe0ee` |
| `--bs-a29` | `#4b1528` | *(baru — teks di atas latar `--bs-a21`)* |
| `--bs-n200` | `#eae7e7` | `#dcfce7` `#f0fdf4` `#bbf7d0` `#ecfdf3` `#faf5ff` `#ead6ff` `#e0e7ff` `#dcd9d7` `#eae7e7` |
| `--bs-n300` | `#d7d3d3` | `#e2e6ec` `#e2e8f0` `#dde0e6` `#cdd5e0` `#ddd` `#ccc` |
| `--bs-n400` | `#bab6b6` | `#cbd5e1` `#aaa` `#bab6b6` |
| `--bs-n600` | `#7d7979` | `#64748b` `#6b7280` `#7a756f` `#8a8683` `#9a958f` `#7d7979` |
| `--bs-n700` | `#605d5d` | `#6f6b67` `#555` `#16a34a` `#166534` `#15803d` `#605d5d` |
| `--bs-n800` | `#444141` | `#475569` `#374151` `#1e293b` `#1f2937` `#333` `#7c3aed` `#4f46e5` `#3730a3` |

**Dua pemetaan yang tampak aneh tetapi disengaja** — ini keputusan desain yang sudah disetujui pengguna, bukan kelalaian:

- **Hijau sukses (`#16a34a` `#166534` `#15803d`) → `--bs-n700` (abu netral).** Prinsipnya: keadaan "beres" tidak diberi warna. Bila yang selesai ikut berteriak, magenta kehilangan artinya.
- **Ungu aksi (`#7c3aed` `#4f46e5` `#3730a3`) → `--bs-n800` (ink).** Aksi bukan status; mewarnai tombol menghabiskan warna yang seharusnya untuk masalah.

**Latar hijau sukses (`#dcfce7` dsb.) → `--bs-n200`**, bukan `--bs-a21`. Magenta lembut hanya untuk yang perlu tindakan.

---

### Tabel pemetaan token lama — WAJIB ikut dikonversi

Warna hardcoded bukan satu-satunya sisa palet lama. **`var(--c-*)` masih menunjuk
nilai palet lama**, jadi layar yang masih memakainya belum benar-benar terkonversi
meski nol hex. Setiap task WAJIB mengganti `var(--c-*)` di wilayahnya juga.

| Token lama | Nilainya | Jadi |
|---|---|---|
| `var(--c-muted)` | `#6b7280` | `var(--bs-n600)` |
| `var(--c-line)` | `#e2e6ec` | `var(--bs-n300)` |
| `var(--c-ok)` | `#16a34a` | `var(--bs-n700)` — hijau "beres" jadi netral |
| `var(--c-err)` | `#dc2626` | `var(--bs-a2)` |
| `var(--c-warn)` | `#ea580c` | `var(--bs-a2)` |
| `var(--c-teal)` | `#0d9488` | `var(--bs-ac)` |
| `var(--c-teal-bg)` | `#f0fdfa` | `var(--bs-ac1)` |
| `var(--c-primary)` | `#1565c0` | `var(--bs-ac)` |
| `var(--c-head1)` | `#16456e` | `var(--bs-ac7)` |
| `var(--c-head2)` | `#1d6299` | `var(--bs-ac7)` |
| `var(--c-text)` | `#1f2937` | `var(--bs-n800)` |
| `var(--c-bg)` | `#eef1f5` | `var(--bs-bg)` |
| `var(--c-card)` | `#fff` | `var(--bs-paper)` |
| `var(--c-purple)` | `#7c3aed` | `var(--bs-n800)` |
| `var(--c-bad)` | **tidak pernah didefinisikan** | `var(--bs-a2)` — lihat catatan |

**Catatan `--c-bad`:** token ini dipakai di dua tombol hapus (`index.html` sekitar
baris 2517 dan 4156) tetapi **tidak ada di `:root`**, sehingga selama ini tidak
menghasilkan warna apa pun dan tombol hapus tampil seperti teks biasa. Ini cacat
lama, bukan akibat konversi. Dipetakan ke `--bs-a2` sebagai **satu-satunya aksi
yang boleh magenta**: menghapus baris adalah kehilangan data, dan konsekuensi itu
harus terlihat. Pengecualian ini sempit dan sengaja ditulis di sini supaya bisa
dibantah reviewer, bukan diselundupkan.

`--radius` **bukan warna** dan tetap dipakai — jangan diganti, jangan dihapus.

---

## Struktur berkas

Seluruh pekerjaan di `index.html`. Peta wilayahnya:

| Wilayah | Baris | Warna | Task |
|---|---|---|---|
| `:root` + blok CSS bersama | 11-272 | 155 | 1 |
| Markup rail + bar atas | 273-298 | — | 1 |
| `#viewTransaksi` + modal terkait | 299-378, 544-1110 | 22 (markup) | 2 |
| Blok `<style>` `#viewSpd` | 366-378 | 1 | 6 |
| Blok `<style>` modal impor | 5245-5278 | 14 | 4 |
| Blok kecil lain | 1573-1581, 1620-1626 | 13 | 2 |
| Fungsi JS perakit markup aplikasi | >1110 | ±92 | 2-7 |
| Fungsi cetak (`<html>` sendiri) | 2307-2333, 4779-4796, 5825-5833, 5944-5952 | 74 | **tidak disentuh** |

---

### Task 1: Kerangka + blok CSS bersama

**Files:**
- Modify: `index.html` — `:root` (11-27), blok CSS bersama (28-272), markup rail & bar atas (273-298)

**Interfaces:**
- Produces untuk Task 2-8: tujuh token baru (`--bs-ac6 --bs-ac3 --bs-a21 --bs-a29 --bs-n300 --bs-n800 --bs-fb`); kelas `.topbar-v2`; kelas `.rail-badge`; fungsi `_railBadge(idMenu, jumlah)`.
- Consumes: tidak ada.

- [ ] **Step 1: Tambahkan tujuh token**

Di `:root` `index.html`, sesudah baris `--bs-fh:'Source Serif 4',Georgia,serif;`, tambahkan:

```css
    --bs-ac6:#0077a0; --bs-ac3:#99e0ff;
    --bs-a21:#fff1f4; --bs-a29:#4b1528;
    --bs-n300:#d7d3d3; --bs-n800:#444141;
    --bs-fb:'Source Serif 4',Georgia,serif;
```

Dan ganti komentar di atas blok `--bs-*` yang berbunyi `/* Broadsheet (kerangka rail-nav baru — dipakai HANYA oleh .rail/.app-main di bawah, BUKAN oleh CSS layar lama, sampai layar-layar itu direstyle sendiri) */` menjadi:

```css
    /* Broadsheet — design system tunggal aplikasi ini. Token --c-* di atas
       adalah sisa palet lama yang sedang dihapus bertahap; jangan dipakai di
       aturan baru. Lihat docs/superpowers/plans/2026-07-28-tema-broadsheet-desktop.md */
```

- [ ] **Step 2: Konversi blok CSS bersama**

Pada `index.html` baris 28-272 (seluruh isi blok `<style>` pertama **di luar** `:root`):

- Ganti **setiap** nilai hex dengan `var(--token)` sesuai tabel pemetaan di atas.
- **Jangan mengubah properti apa pun selain nilai warna.** Ukuran, jarak, radius, `font-weight`, `display`, dan selektor tetap.
- Dua pengecualian yang **ditambahkan**, karena ini bagian dari tema:
  - pada aturan `body`, tambahkan `font-family:var(--bs-fb);`
  - pada aturan yang menetapkan `border-radius` kartu statistik/panel, tidak diubah.

Bila menemukan hex yang **tidak ada** di tabel pemetaan: hentikan, catat nomor barisnya, laporkan sebagai `NEEDS_CONTEXT`. Jangan menebak.

- [ ] **Step 3: Verifikasi blok bersama bersih**

```bash
cd /home/user/kas-tunai
sed -n '28,272p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: tidak ada keluaran. Bila ada, kembali ke Step 2.

```bash
sed -n '11,272p' index.html | grep -c "var(--c-"
```

Expected: `0`.

- [ ] **Step 4: Ganti nama dan urutan menu rail**

Cari enam tombol `class="rail-item"` di `index.html` (sekitar baris 284-289) dan susun ulang **urutannya** menjadi persis ini, dengan label persis ini:

```html
  <button id="tabTransaksi" class="rail-item" onclick="switchTab('transaksi')">Transaksi</button>
  <button id="tabPajak"     class="rail-item" onclick="switchTab('pajak')">Nota Kena Pajak</button>
  <button id="tabDana"      class="rail-item" onclick="switchTab('dana')">Pagu &amp; realisasi</button>
  <button id="tabSpd"       class="rail-item" onclick="switchTab('spd')">Perjalanan dinas</button>
  <button id="tabRekon"     class="rail-item" onclick="switchTab('rekon')">Rekonsiliasi</button>
  <button id="tabLaporan"   class="rail-item" onclick="switchTab('laporan')">Laporan</button>
```

**`id` dan argumen `switchTab` tidak boleh diubah** — keduanya dipakai `switchTab()` dan `_applyRoleUI()`. Yang berubah hanya urutan baris dan teks label.

- [ ] **Step 5: Tambahkan lencana angka**

Tambahkan CSS di blok bersama:

```css
  .rail-badge{display:inline-block;min-width:20px;padding:1px 6px;margin-left:6px;
    border-radius:999px;background:var(--bs-a2);color:var(--bs-paper);
    font-family:var(--bs-fb);font-size:11px;font-weight:600;text-align:center}
  .rail-item.active .rail-badge{background:rgba(255,255,255,.25)}
```

Tambahkan fungsi ini di JS, dekat `_applyRoleUI`:

```js
/* Lencana angka pada menu rail. Hanya tampil bila n > 0 — lencana berangka nol
   atau palsu lebih buruk daripada tanpa lencana. */
function _railBadge(idMenu, n){
  var el=document.getElementById(idMenu); if(!el) return;
  var b=el.querySelector('.rail-badge');
  if(!(+n>0)){ if(b) b.remove(); return; }
  if(!b){ b=document.createElement('span'); b.className='rail-badge'; el.appendChild(b); }
  b.textContent=String(+n);
}
```

Panggil dari `loadAll()`, tepat sesudah `renderList();`:

```js
      _railBadge('tabTransaksi', _jumlahBelumSpj());
```

Dan tambahkan fungsi penghitungnya, yang **memakai ulang predikat penyaring chip "Belum SPJ" yang sudah ada** — cari fungsi penyaring daftar transaksi di `index.html` dan pakai predikat yang sama persis. Jangan menulis kriteria kedua; dua definisi yang menyimpang membuat angka di rail berbeda dari isi layarnya.

Bila predikat itu tidak terpisah sebagai fungsi yang bisa dipakai ulang, **laporkan sebagai `NEEDS_CONTEXT`** beserta potongan kodenya — jangan menyalin kondisinya ke tempat baru.

Lencana Rekonsiliasi dipanggil dari `_refreshRingkasanRekon()` yang sudah ada, memakai jumlah selisih yang sudah dihitung di sana. **Menu "Pagu & realisasi" tidak diberi lencana.**

- [ ] **Step 6: Bar atas**

Sisipkan tepat sesudah pembuka `.app-main` dan sebelum layar pertama:

```html
<div class="topbar-v2">
  <div class="tb-slot" id="tbSlot"></div>
  <button class="tb-utama" onclick="openModalTransaksi()">Catat transaksi</button>
</div>
```

CSS-nya di blok bersama:

```css
  .topbar-v2{display:flex;align-items:center;gap:12px;padding:14px 24px;
    border-bottom:1px solid var(--bs-n300);background:var(--bs-bg)}
  .tb-slot{flex:1;min-width:0}
  .tb-utama{border:0;border-radius:999px;background:var(--bs-ac);color:var(--bs-paper);
    font-family:var(--bs-fb);font-size:14px;font-weight:600;padding:0 18px;
    min-height:44px;cursor:pointer}
  .tb-utama:hover{background:var(--bs-ac6)}
```

`#tbSlot` sengaja kosong. Kolom cari dan pemilih periode dipindahkan ke sana pada **Task 2**, bukan sekarang.

Bila nama fungsi pembuka modal transaksi bukan `openModalTransaksi`, pakai nama yang memang ada — periksa dulu, jangan menebak.

- [ ] **Step 7: Kaki rail — saldo dan menu avatar**

Elemen saldo yang sudah ada **wajib tetap membawa kelas `saldo-pill`**. Gayakan ulang warnanya saja lewat tabel pemetaan.

Ganti tiga tombol "Kelola User", "Pengaturan", "Keluar" di kaki rail menjadi satu baris avatar yang membuka menu kecil:

```html
<div class="rail-akun">
  <button class="rail-avatar" onclick="toggleMenuAkun()" title="Akun">
    <span id="avInisial">FD</span>
  </button>
  <div class="rail-akun-menu hidden" id="menuAkun">
    <button class="rail-item" id="btnUsers" onclick="openModalUsers()">Kelola User</button>
    <button class="rail-item" id="btnSettings" onclick="openModalSettings()">Pengaturan</button>
    <button class="rail-item" id="btnLogout" onclick="logout()">Keluar</button>
  </div>
</div>
```

```js
function toggleMenuAkun(){
  var m=document.getElementById('menuAkun'); if(m) m.classList.toggle('hidden');
}
```

```css
  .rail-akun{margin-top:10px;position:relative}
  .rail-avatar{display:flex;align-items:center;justify-content:center;
    width:34px;height:34px;border:0;border-radius:999px;background:var(--bs-ac);
    color:var(--bs-paper);font-family:var(--bs-fh);font-size:13px;font-weight:600;cursor:pointer}
  .rail-akun-menu{margin-top:6px}
  .rail-akun-menu.hidden{display:none}
```

**`id="btnUsers"`, `id="btnSettings"`, dan `id="btnLogout"` wajib dipertahankan** — `_applyRoleUI()` memakai ketiganya untuk mengunci menu admin. Elemen saldo wajib tetap membawa **kedua** kelas `saldo-pill` dan `saldo-sum` bila keduanya ada sekarang. Bila nama fungsi `openModalUsers`/`openModalSettings`/`logout` berbeda di berkas, pakai yang memang ada.

- [ ] **Step 8: Breakpoint rail**

Tambahkan di blok bersama:

```css
  @media (max-width:1365px){
    .rail{width:76px;padding:20px 10px}
    .rail-item{justify-content:center;padding-left:0;padding-right:0}
    .rail-item .rail-label{display:none}
    .rail-badge{min-width:8px;width:8px;height:8px;padding:0;margin:0;
      position:absolute;top:6px;right:6px;font-size:0;line-height:0}
    .rail-item{position:relative}
  }
```

Bungkus teks label tiap `.rail-item` dengan `<span class="rail-label">…</span>` dan tambahkan atribut `title` berisi teks yang sama, supaya labelnya tetap terbaca saat rail menyusut.

- [ ] **Step 9: Periksa sintaks dan pagar keselamatan**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('index.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s);
fs.writeFileSync('/tmp/ih.js', m[1]);
" && node --check /tmp/ih.js && echo "SINTAKS OK" && rm -f /tmp/ih.js

grep -c "saldo-pill" index.html          # harus >= 2 (CSS + markup)
grep -c "flex:0 0 100%" index.html       # harus >= 1  (#mobileTip)
grep -c "position:sticky" index.html     # harus >= 1  (.rail)
grep -c 'id="btnUsers"' index.html        # harus 1
grep -c 'id="btnSettings"' index.html     # harus 1
grep -c 'id="btnLogout"' index.html       # harus 1
grep -c "saldo-sum" index.html            # harus >= 2 (CSS + markup)
```

Expected: `SINTAKS OK`, lalu keempat angka memenuhi syarat di komentarnya.

- [ ] **Step 10: Tulis skrip verifikasi bersama**

Skrip ini dipakai ulang oleh seluruh task berikutnya. Tulis ke
`/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js`.
**Jangan dikomit, jangan dihapus** sampai task terakhir.

Pasang Playwright bila belum ada (peramban sudah tersedia, jangan mengunduh):

```bash
cd /home/user/kas-tunai
node -e "require.resolve('playwright')" 2>/dev/null || \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright
```

```js
const fs=require('fs'), path=require('path');
const {chromium}=require('playwright');
const REPO='/home/user/kas-tunai';
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT='/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad';

function muat(){
  return fs.readFileSync(path.join(REPO,'index.html'),'utf8')
    .replace(/<\?=\s*iconUrl\s*\?>/g,'')
    .replace(/<\?=\s*webAppUrl\s*\?>/g,'http://localhost/')
    .replace(/<\?!?=?[\s\S]*?\?>/g,'');
}
let gagal=0;
function cek(nama,dapat,harap){
  const ok=String(dapat)===String(harap); if(!ok) gagal++;
  console.log((ok?'PASS  ':'FAIL  ')+nama+(ok?'':`  dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`));
}

const MENU=[
  ['tabTransaksi','viewTransaksi'],
  ['tabPajak','viewPajak'],
  ['tabDana','viewDana'],
  ['tabSpd','viewSpd'],
  ['tabRekon','viewRekon'],
  ['tabLaporan','viewLaporan']
];

(async()=>{
  const browser=await chromium.launch({executablePath:EXE});
  for (const lebar of [1440,1280]){
    const page=await browser.newPage({viewport:{width:lebar,height:900}});
    page.on('pageerror',e=>{console.log('GALAT HALAMAN: '+e.message); gagal++;});
    await page.setContent(muat(),{waitUntil:'domcontentloaded'});

    const rail=await page.evaluate(()=>{
      var r=document.querySelector('.rail'); if(!r) return null;
      return {w:Math.round(r.getBoundingClientRect().width), pos:getComputedStyle(r).position};
    });
    cek(`rail position sticky @${lebar}`, rail && rail.pos, 'sticky');
    cek(`rail lebar sesuai breakpoint @${lebar}`,
        rail && (lebar>=1366 ? rail.w>=200 : rail.w<=100), true);

    const mainW=await page.evaluate(()=>{
      var m=document.querySelector('.app-main'); return m?Math.round(m.getBoundingClientRect().width):0;
    });
    cek(`app-main lebar > 0 @${lebar}`, mainW>0, true);

    for (const [tab,view] of MENU){
      if (await page.locator('#'+tab).count()===0){ cek(`menu ${tab} ada @${lebar}`, false, true); continue; }
      await page.click('#'+tab);                       // KLIK NYATA, bukan page.evaluate
      const tampil=await page.evaluate(v=>{
        var e=document.getElementById(v); return e ? !e.classList.contains('hidden') : null;
      }, view);
      cek(`klik ${tab} membuka ${view} @${lebar}`, tampil, true);
      if (lebar===1440) await page.screenshot({path:`${OUT}/${view}-1440.png`});
    }

    cek(`bar atas ada @${lebar}`, await page.locator('.topbar-v2').count(), 1);
    cek(`saldo-pill ada @${lebar}`, await page.locator('.saldo-pill').count()>0, true);
    await page.close();
  }
  await browser.close();
  console.log(gagal===0?'\nSEMUA LOLOS':'\n'+gagal+' GAGAL');
  process.exit(gagal===0?0:1);
})();
```

- [ ] **Step 11: Jalankan verifikasi**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0. Tangkapan layar tiap layar tersimpan di scratchpad sebagai bukti visual.

- [ ] **Step 12: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet pada CSS bersama dan kerangka v2"
```

---

### Task 2: Layar Transaksi

**Files:**
- Modify: `index.html` — markup `#viewTransaksi` (299-365), blok `<style>` 1573-1581 dan 1620-1626, fungsi JS perakit daftar transaksi (`renderList` dan pembantunya), modal yang dipanggil layar ini

**Interfaces:**
- Consumes dari Task 1: seluruh token `--bs-*`, kelas `.topbar-v2`, `#tbSlot`.
- Produces: tidak ada antarmuka baru.

- [ ] **Step 1: Pindahkan kolom cari dan pemilih periode ke bar atas**

Pindahkan elemen pencarian dan penyaring bulan dari dalam `#viewTransaksi` ke `#tbSlot` (dibuat di Task 1). **Pindahkan elemennya apa adanya** — `id`, `oninput`/`onchange`, dan fungsi yang dipanggil tidak berubah. Hanya lokasinya di DOM yang berpindah.

Penyaring "Penanggung Jawab" dan "Urutkan" **tetap di dalam layar** — keduanya khas Transaksi, sedangkan bar atas berlaku global.

- [ ] **Step 2: Konversi warna layar ini**

Pada markup `#viewTransaksi`, dua blok `<style>` kecil (1573-1581, 1620-1626), dan **fungsi JS yang merakit daftar transaksi**:

- Ganti setiap hex dengan `var(--token)` sesuai tabel pemetaan.
- Chip filter: yang aktif `background:var(--bs-ac);color:var(--bs-paper)`; yang tidak aktif `background:transparent;border:1px solid var(--bs-n400);color:var(--bs-ink)`. Semua chip berpenampilan sama kecuali yang aktif.
- Pil status yang berarti **perlu tindakan** ("Belum SPJ", "Nota Belum Lunas", "Cek pajak manual"): `background:var(--bs-a2);color:var(--bs-paper)`.
- Pil status yang berarti **beres** ("Lunas", "SPJ Lengkap", "Nota … (100%)", "tersimpan", "Bebas PPh & PPN"): hapus pilnya, atau bila teksnya perlu tetap ada, `background:var(--bs-n200);color:var(--bs-n700)`.
- Pil informasi ("Tunai", "Bank"): `background:var(--bs-n800);color:var(--bs-paper)`.
- Nominal: `font-family:var(--bs-fh);font-weight:600;text-align:right;font-variant-numeric:tabular-nums`, warna `var(--bs-ink)` — **tanpa** merah/hijau.
- Kartu yang perlu tindakan: `background:var(--bs-a21);border-radius:14px`.

**Dilarang mengubah susunan.** Dua kolom "Belum Ada Nota" / "Sudah Ada Nota" tetap dua kolom.

- [ ] **Step 3: Verifikasi layar ini bersih**

```bash
cd /home/user/kas-tunai
sed -n '299,365p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
sed -n '1573,1581p;1620,1626p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: kedua perintah tidak mengeluarkan apa pun.

- [ ] **Step 4: Jalankan verifikasi klik nyata**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0. Skrip ini ditulis pada
Task 1; bila berkasnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

Tambahan khusus task ini — chip filter diklik sungguhan:

```bash
cd /home/user/kas-tunai
node -e "
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  await p.setContent(fs.readFileSync('index.html','utf8').replace(/<\?!?=?[\s\S]*?\?>/g,''),{waitUntil:'domcontentloaded'});
  await p.click('#tabTransaksi');
  const n=await p.locator('#viewTransaksi .chip, #viewTransaksi .filter-chip').count();
  console.log(n>0?'PASS  chip filter ditemukan: '+n:'FAIL  chip filter tidak ditemukan');
  await b.close(); process.exit(n>0?0:1);
})();"
```

Expected: `PASS`, jumlah chip > 0.

- [ ] **Step 5: Verifikasi tangkapan layar**

Buka `transaksi-1440.png` di scratchpad dan pastikan: latar terang `#f3f2f2`,
kartu putih, tidak ada hijau tua/oranye tersisa pada kerangka, chip aktif
berlatar teal. Laporkan bila ada yang mencolok — tangkapan layar ini bukti
untuk pengguna, bukan formalitas.

- [ ] **Step 6: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Transaksi"
```

---

### Task 3: Layar Nota Kena Pajak

**Files:**
- Modify: `index.html` — markup `#viewPajak` (498-513), fungsi JS perakit daftarnya, modal pajak (`#modalPajak`, 835-889)

**Interfaces:**
- Consumes dari Task 1: token `--bs-*`.
- Produces: tidak ada.

- [ ] **Step 1: Konversi warna**

Pada markup `#viewPajak`, fungsi JS yang merakit isinya, dan `#modalPajak` beserta fungsi `recalcPajak` yang merakit `#pjRincian`:

Ganti setiap hex dengan `var(--token)` sesuai tabel pemetaan, dengan aturan pil yang sama seperti Task 2 Step 2 (perlu tindakan → magenta; beres → netral atau tanpa pil; informasi → ink).

Blok "Total potongan" di rincian pajak: nominal `var(--bs-fh)` 600 rata kanan, warna `var(--bs-a2)` — ini satu-satunya nominal yang boleh magenta, karena ia uang yang wajib disetor.

- [ ] **Step 2: Verifikasi bersih**

```bash
cd /home/user/kas-tunai
sed -n '498,513p;835,889p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: tidak ada keluaran.

- [ ] **Step 3: Verifikasi klik nyata**

Jalankan skrip verifikasi bersama yang ditulis pada Task 2:

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — termasuk
`klik tabPajak membuka viewPajak @1440` dan `@1280`. Tangkapan layar
`viewPajak-1440.png` tersimpan di scratchpad sebagai bukti visual.

Bila berkas skripnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Nota Kena Pajak"
```

---

### Task 4: Layar Pagu & realisasi

**Files:**
- Modify: `index.html` — markup `#viewDana` (514-538), blok `<style>` 5245-5278, fungsi `renderDana` dan pembantunya, `#modalPagu` (544-570), `#modalImporItem` (791-818)

**Interfaces:**
- Consumes dari Task 1: token `--bs-*`.
- Produces: tidak ada.

- [ ] **Step 1: Konversi warna**

Ganti setiap hex sesuai tabel pemetaan pada markup `#viewDana`, blok `<style>` 5245-5278, fungsi `renderDana`, dan kedua modal di atas.

Aturan khusus layar ini:
- Bar serapan: isi `var(--bs-ac)`; **magenta `var(--bs-a2)` HANYA bila `x.lebihPagu`** (sisaAman < 0); alur `var(--bs-n300)`.

  > **Koreksi 29 Jul 2026 (commit `0c14039`).** Versi pertama aturan ini berbunyi
  > "bila persentase > 90 jadi magenta". **Dibatalkan.** Ambang >90% itu milik
  > panel "Sisa pagu paling tipis" di layar Papan kerja, bukan layar ini. Dua
  > sebabnya: `pct` dibatasi `Math.min(100,…)`, sehingga item yang melewati pagu
  > 200% dan item yang pas 95% menampilkan bar magenta penuh yang identik —
  > informasi "sudah lewat pagu" hilang dari bar; dan serapan tinggi itu wajar
  > menjelang akhir tahun anggaran, sehingga memberinya magenta mengencerkan arti
  > magenta sebagai "perlu tindakan". Mengganti kondisi pewarnaan juga melanggar
  > Global Constraint "dilarang mengubah logika JS" — yang dilanggar oleh aturan
  > lama itu sendiri, bukan oleh pelaksananya.
- Baris item yang melebihi pagu (`lebihPagu`): `background:var(--bs-a21);border-radius:14px`, dan pil "Lebih pagu" `background:var(--bs-a2);color:var(--bs-paper)`.
- Kartu ringkas "Sisa aman": `background:var(--bs-ac);color:var(--bs-paper)`.

- [ ] **Step 2: Verifikasi bersih**

```bash
cd /home/user/kas-tunai
sed -n '514,538p;544,570p;791,818p;5245,5278p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: tidak ada keluaran.

- [ ] **Step 3: Verifikasi klik nyata**

Jalankan skrip verifikasi bersama yang ditulis pada Task 2:

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — termasuk
`klik tabDana membuka viewDana @1440` dan `@1280`. Tangkapan layar
`viewDana-1440.png` tersimpan di scratchpad sebagai bukti visual.

Bila berkas skripnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Pagu dan realisasi"
```

---

### Task 5: Layar Rekonsiliasi

**Files:**
- Modify: `index.html` — markup `#viewRekon` (476-497), fungsi JS perakit tabel rekonsiliasi dan kartu ketenangan (`_ikonRekon`, `_refreshRingkasanRekon` dan pembantunya), `#modalImporRk` (638-668), `#modalImporSakti` (669-704)

**Interfaces:**
- Consumes dari Task 1: token `--bs-*`, fungsi `_railBadge`.
- Produces: tidak ada.

- [ ] **Step 1: Konversi warna**

Ganti setiap hex sesuai tabel pemetaan. Aturan khusus:
- Ikon status rekonsiliasi (`_ikonRekon`) memakai `currentColor`; yang perlu diubah hanya warna induknya. Status cocok → `var(--bs-n700)`; status berselisih → `var(--bs-a2)`; status menunggu → `var(--bs-n600)`.
- Baris berselisih: `background:var(--bs-a21);border-radius:14px`.

- [ ] **Step 2: Pasang lencana Rekonsiliasi**

Di dalam `_refreshRingkasanRekon()`, sesudah jumlah selisih dihitung, tambahkan:

```js
      _railBadge('tabRekon', jumlahSelisih);
```

Pakai variabel jumlah selisih yang **sudah ada** di fungsi itu. Bila tidak ada variabel semacam itu, laporkan `NEEDS_CONTEXT` — jangan menghitung ulang dengan kriteria baru.

- [ ] **Step 3: Verifikasi bersih**

```bash
cd /home/user/kas-tunai
sed -n '476,497p;638,704p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: tidak ada keluaran.

- [ ] **Step 4: Verifikasi klik nyata**

Jalankan skrip verifikasi bersama yang ditulis pada Task 2:

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — termasuk
`klik tabRekon membuka viewRekon @1440` dan `@1280`. Tangkapan layar
`viewRekon-1440.png` tersimpan di scratchpad sebagai bukti visual.

Bila berkas skripnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Rekonsiliasi"
```

---

### Task 6: Layar Perjalanan Dinas

**Files:**
- Modify: `index.html` — blok `<style>` 366-378, markup `#viewSpd` (379-467), fungsi JS perakitnya

**Interfaces:**
- Consumes dari Task 1: token `--bs-*`.
- Produces: tidak ada.

- [ ] **Step 1: Konversi warna**

Ganti setiap hex sesuai tabel pemetaan pada blok `<style>` 366-378, markup `#viewSpd`, dan fungsi JS yang merakit tabel pelaksana.

Aturan khusus: blok "Wajib dikembalikan" → nominal `var(--bs-a2)`, latar `var(--bs-a21)` radius 14px. Kartu total uang muka → `background:var(--bs-ac);color:var(--bs-paper)`.

Kelas `.bdhlbl` yang memakai `#3730a3` ikut dipetakan ke `var(--bs-n800)`.

- [ ] **Step 2: Verifikasi bersih**

```bash
cd /home/user/kas-tunai
sed -n '366,467p' index.html | grep -oP "(?<!&)#[0-9a-fA-F]{3,6}\b" | sort -u
```

Expected: tidak ada keluaran.

- [ ] **Step 3: Verifikasi klik nyata**

Jalankan skrip verifikasi bersama yang ditulis pada Task 2:

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — termasuk
`klik tabSpd membuka viewSpd @1440` dan `@1280`. Tangkapan layar
`viewSpd-1440.png` tersimpan di scratchpad sebagai bukti visual.

Bila berkas skripnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

- [ ] **Step 4: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Perjalanan Dinas"
```

---

### Task 7: Layar Laporan + modal sisa

**Files:**
- Modify: `index.html` — markup `#viewLaporan` (468-475), seluruh modal yang belum tersentuh Task 2-6, dan sisa fungsi JS perakit markup aplikasi

**Interfaces:**
- Consumes dari Task 1: token `--bs-*`.
- Produces: tidak ada.

- [ ] **Step 1: Daftar dulu apa yang tersisa**

```bash
cd /home/user/kas-tunai
grep -noP "(?<!&)#[0-9a-fA-F]{3,6}\b" index.html | head -100
```

Untuk setiap kemunculan, tentukan wilayahnya. Yang berada di dalam fungsi cetak (`<html>` sendiri, dibuka lewat `_bukaPopup`) **dilewati**. Sisanya dikonversi di task ini.

- [ ] **Step 2: Konversi warna**

Ganti setiap hex sesuai tabel pemetaan pada markup `#viewLaporan`, modal yang tersisa (`#modalPilihTx`, `#modalTransaksi`, `#modalPindah`, `#modalBackfill`, `#modalNota`, `#modalKembali`, `#modalBukti`, `#modalFoto`, `#modalUsers`, `#modalPecah`, `#modalSpbyGab`, `#modalSettings`, `#modalScan`, `#modalKuitansi`, `#modalSpby`, `#modalLogin`, `#modalGantiPw`), dan sisa fungsi JS perakit markup aplikasi.

- [ ] **Step 3: Verifikasi seluruh aplikasi bersih**

```bash
cd /home/user/kas-tunai
python3 - <<'EOF'
import re
L=open('index.html').read().split('\n')
pat=re.compile(r'(?<!&)#[0-9a-fA-F]{6}\b|(?<!&)#[0-9a-fA-F]{3}\b')
instyle=False; sisa=[]
for i,ln in enumerate(L,1):
    if '<style>' in ln: instyle=True
    if pat.findall(ln):
        cetak = bool(re.search(r"<html|@media print|page-break|<t[dhr]|<table", ln))
        if not cetak: sisa.append((i, ln.strip()[:100]))
    if '</style>' in ln: instyle=False
print("sisa warna UI aplikasi:", len(sisa))
EOF
```

Dan pemeriksaan kedua, untuk token lama yang tersisa di seluruh berkas:

```bash
cd /home/user/kas-tunai
grep -c "var(--c-" index.html
for i,t in sisa[:40]: print(f"  {i}: {t}")
EOF
```

Expected: `sisa warna UI aplikasi: 0` **dan** `grep -c "var(--c-"` = `0`.

Task 7 adalah penyapu terakhir: layar-layar terdahulu dikonversi sebelum tabel token lama di atas ditambahkan ke rencana, jadi sebagian `var(--c-*)` milik layar Transaksi dan Nota Kena Pajak kemungkinan masih tersisa. Bereskan semuanya di sini, apa pun layarnya.

- [ ] **Step 4: Verifikasi klik nyata**

Jalankan skrip verifikasi bersama yang ditulis pada Task 2:

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — termasuk
`klik tabLaporan membuka viewLaporan @1440` dan `@1280`. Tangkapan layar
`viewLaporan-1440.png` tersimpan di scratchpad sebagai bukti visual.

Bila berkas skripnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis
ulang dengan skenario karangan sendiri.

- [ ] **Step 5: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "feat(desktop): tema Broadsheet layar Laporan dan modal sisa"
```

---

### Task 8: Hapus token lama + verifikasi menyeluruh

**Files:**
- Modify: `index.html` — `:root`
- Test: skrip Playwright di scratchpad (tidak dikomit)

**Interfaces:**
- Consumes: hasil Task 1-7.
- Produces: tidak ada.

- [ ] **Step 1: Pastikan skrip verifikasi tersedia**

Skrip verifikasi bersama ditulis pada Task 2 ke
`/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js`.

```bash
ls -l /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
cd /home/user/kas-tunai
node -e "require.resolve('playwright')" 2>/dev/null || \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright
```

Bila berkasnya tidak ada, **laporkan `NEEDS_CONTEXT`** — jangan menulis ulang skrip
dengan skenario karangan sendiri; hasilnya tidak akan sebanding dengan hasil task
sebelumnya, dan perbandingan itulah gunanya di Step 5.

- [ ] **Step 2: Jalankan verifikasi sebelum penghapusan**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0.

- [ ] **Step 3: Pastikan tidak ada lagi yang memakai `--c-*`**

```bash
cd /home/user/kas-tunai
grep -c "var(--c-" index.html
```

Expected: `0`. Bila bukan nol, jalankan `grep -n "var(--c-" index.html`, konversi baris-baris itu sesuai tabel pemetaan, lalu ulangi Step 2.

- [ ] **Step 4: Hapus token lama**

Hapus dari `:root` `index.html` seluruh baris deklarasi `--c-*`:

```css
    --c-primary:#1565c0; --c-head1:#16456e; --c-head2:#1d6299;
    --c-bg:#eef1f5; --c-card:#fff; --c-line:#e2e6ec;
    --c-text:#1f2937; --c-muted:#6b7280; --c-ok:#16a34a; --c-warn:#ea580c;
    --c-err:#dc2626; --c-purple:#7c3aed; --radius:12px;
    --c-teal:#0d9488; --c-teal-bg:#f0fdfa;
```

**`--radius:12px` dipertahankan** — itu bukan warna dan masih dipakai. Pindahkan deklarasinya ke baris tersendiri sebelum blok `--bs-*`.

- [ ] **Step 5: Jalankan ulang verifikasi sesudah penghapusan**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
```

Expected: seluruh baris `PASS`, `SEMUA LOLOS`, exit 0 — **sama persis** dengan hasil Step 2. Bila ada yang berubah, ada aturan yang masih bergantung pada `--c-*`; kembalikan penghapusannya, perbaiki, ulangi.

- [ ] **Step 6: Pastikan dokumen cetak tidak tersentuh**

Bandingkan seluruh rentang pekerjaan tema (dari commit sebelum Task 1 sampai HEAD)
dan pastikan tidak ada baris dokumen cetak yang berubah:

```bash
cd /home/user/kas-tunai
BASE=$(git log --format=%H --grep="tema Broadsheet pada CSS bersama" -1)^
git diff $BASE HEAD -- index.html | grep "^[-+]" \
  | grep -cP "<html|@media print|page-break|_bukaPopup"
```

Expected: `0`.

Bila bukan nol, jalankan perintah yang sama tanpa `-c` untuk melihat barisnya, lalu
kembalikan baris-baris itu ke keadaan semula — dokumen cetak berada di luar cakupan
seluruh rencana ini.

- [ ] **Step 7: Bersihkan dan commit**

```bash
rm -f /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-tema-ui.js
cd /home/user/kas-tunai && rm -rf node_modules package-lock.json 2>/dev/null; true
git add index.html
git commit -m "refactor(desktop): hapus token palet lama, Broadsheet jadi tunggal"
```

- [ ] **Step 8: Perbarui papan status**

Di `docs/HANDOFF-DESKTOP.md` bagian 1, tambahkan baris:

```
| — | **1b** | Tema Broadsheet menyeluruh + kerangka v2 (bar atas, menu, breakpoint) | 🟡 kode selesai; uji klik nyata 2 lebar lolos; **belum diuji manual di browser sungguhan** — perlu deploy.bat sebelum ✅ |
```

Dan di bagian 3b, tambahkan catatan bahwa layar sudah bertema Broadsheet tetapi **struktur isinya belum** v2 (Transaksi masih dua kolom kartu, bukan tabel + panel).

```bash
cd /home/user/kas-tunai
git add docs/HANDOFF-DESKTOP.md
git commit -m "docs: catat tema Broadsheet di papan status desktop"
```

---

## Catatan untuk pelaksana

- **Nomor baris adalah petunjuk, bukan jaminan** — ia bergeser setelah tiap task. Cari berdasarkan `id`/selektor/nama fungsi, bukan nomornya.
- **Warna di luar tabel pemetaan tidak boleh ditebak.** Laporkan `NEEDS_CONTEXT` dengan nomor barisnya.
- **Bila sebuah nama fungsi di plan ini tidak ada di berkas**, jangan mencari padanan terdekat — laporkan.
- **Jangan mengubah struktur.** Bila sebuah konversi warna terasa menuntut perubahan tata letak, itu tanda batas task terlampaui: laporkan, jangan kerjakan.
- **Verifikasi akhir tetap manual** di browser sungguhan setelah `deploy.bat`. Uji otomatis membuktikan markup dan warna, bukan bagaimana rasanya dipakai.
