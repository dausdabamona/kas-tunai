# Kerangka Rail-Nav Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti navigasi tab horizontal di atas `index.html` (desktop) dengan navigasi rail vertikal di kiri (236px), memakai design system Broadsheet — tanpa mengubah isi/tampilan 6 layar yang sudah ada.

**Architecture:** Ganti terarah (bukan rombak total): markup `.topbar`/`.tabs` lama diganti markup `.rail`/`.app-main` baru; enam `<div id="view...">` yang sudah ada tetap di posisi DOM-nya masing-masing, cuma dibungkus ulang; `switchTab()` tidak diubah sama sekali (toggle per-`id`, kompatibel selama `id` tidak berganti). Token warna Broadsheet ditambahkan berdampingan dengan token lama (`--c-*`), tidak menggantikannya — isi layar direstyle di tugas terpisah nanti.

**Tech Stack:** Vanilla JS ES5, HTML, CSS murni di satu file `index.html` — tanpa build step, tanpa dependency baru. Verifikasi lewat Playwright (`/opt/node22/lib/node_modules/playwright`, Chromium `/opt/pw-browsers/chromium`) dengan klik nyata (`page.click()`), bukan cuma panggilan fungsi.

## Global Constraints

- **Isi 6 layar yang sudah ada TIDAK diubah tampilannya** — `viewTransaksi`, `viewSpd`, `viewLaporan`, `viewRekon`, `viewPajak`, `viewDana` dipindah posisi bungkusnya saja, isi di dalamnya (termasuk semua elemen dan `style` inline-nya) tetap 100% sama.
- **TIDAK ada menu "Papan kerja" atau "Pagu & realisasi"** di rail ini — itu ide yang eksplisit DIBATALKAN pengguna saat brainstorming. Rail berisi PERSIS 6 menu yang sudah ada sekarang (Transaksi, Perjalanan Dinas, Laporan, Nota Kena Pajak, Ketersediaan Dana, Rekonsiliasi).
- **Token CSS lama (`--c-*`) TIDAK dihapus/diganti** — dipertahankan karena isi 6 layar masih memakainya. Token Broadsheet baru (`--bs-*`) ditambahkan berdampingan.
- Layar default saat halaman dimuat: **Transaksi** (`viewTransaksi` tanpa `hidden`, `tabTransaksi` berkelas `active`) — sama seperti sekarang.
- `switchTab(tab)` (`index.html:1362-1379`) **tidak diubah** — semua `id` elemen yang disentuhnya (`viewTransaksi`, `tabTransaksi`, dst.) harus tetap sama persis di markup baru.
- Modal-modal (`Impor Pagu`, `Pilih Jenis Transaksi`, dll., dimulai baris 522 `<!-- MODAL IMPOR PAGU -->`) ada di LUAR `.app-main` dan tidak disentuh tugas ini.
- **Satu pengecualian wajib pada "JS tidak diubah"**: `_applyRoleUI()` (`index.html:1645-1650`) memakai `document.querySelector('.topbar .saldo-pill')` untuk **menyembunyikan saldo dari akun peran `viewer`** (komentar di baris 1815: "peninjau tidak melihat saldo" — ini kontrol akses, bukan kosmetik). Karena `.topbar` dihapus total oleh tugas ini, selector itu akan berhenti menemukan elemen apa pun — kodenya dijaga `if(sp)` jadi TIDAK error, tapi efeknya: saldo viewer **diam-diam berhenti disembunyikan**. Ini ditemukan lewat eksplorasi kode saat menulis rencana ini (bukan bagian spec awal) — ganti selector itu jadi `.saldo-pill` saja (tanpa `.topbar`), dan pastikan elemen saldo baru di rail tetap membawa kelas `saldo-pill` supaya selector itu tetap menemukannya. Lihat Task 1 Step 4 dan Step 4.5.
- Spec sumber: `docs/superpowers/specs/2026-07-28-desktop-rail-nav-design.md` (5 bagian, disetujui pengguna 28 Jul 2026).

---

## File Structure

Satu file yang diubah: **`index.html`** — tiga area:
- **CSS `:root`** (~baris 11-15): tambah token Broadsheet berdampingan.
- **CSS aturan baru**: tambah `.rail`/`.rail-item`/`.app-main`/dst setelah aturan `.tabs` lama (dibiarkan, tidak dipakai markup baru tapi tidak mengganggu); ubah `.wrap` (~baris 37).
- **Markup body** (baris 257-277): ganti `.topbar`+`.tabs` jadi `.rail`+pembuka `.app-main`; tambah penutup `.app-main` setelah `viewDana` (baris ~520, sebelum komentar `MODAL IMPOR PAGU` di baris ~522).

Tidak ada file baru dibuat, tidak ada file `.gs` disentuh.

---

### Task 1: Markup + CSS rail-nav

**Files:**
- Modify: `index.html:11-15` (tambah token CSS)
- Modify: `index.html` (tambah aturan CSS baru + ubah `.wrap`, setelah blok `.tabs button.active{...}` yang sudah ada)
- Modify: `index.html:257-277` (ganti markup topbar/tabs jadi rail)
- Modify: `index.html` (tambah penutup `.app-main` setelah `viewDana`, sebelum komentar `MODAL IMPOR PAGU`)
- Modify: `index.html:<head>` (tambah link font Source Serif 4)

**Interfaces:**
- Consumes: `switchTab(tab)` (`index.html:1362-1379`, tidak diubah), `doLogout()`, `openModalUsers()`, `openModalSettings()` (semua sudah ada, tidak diubah). `_applyRoleUI()` (`index.html:1645-1650`) juga dikonsumsi — SATU baris di dalamnya diubah (Step 6) karena bergantung pada `.topbar` yang dihapus task ini, lihat Global Constraints.
- Produces: kelas CSS `.rail`/`.rail-brand`/`.rail-item`/`.rail-item.active`/`.rail-spacer`/`.rail-saldo`/`.app-main` — tidak dikonsumsi task lain dalam plan ini (Task 2 murni verifikasi, tidak menambah kode).

- [ ] **Step 1: Tambah link font Source Serif 4**

Cari baris ini di `index.html` (dalam `<head>`, dekat link JetBrains Mono yang sudah ada):

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
```

Ganti dengan (baris lama dipertahankan, satu baris baru ditambah setelahnya):

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Tambah token CSS Broadsheet**

Cari blok ini di `index.html` (~baris 11-15):

```css
  :root{
    --c-primary:#1565c0; --c-head1:#16456e; --c-head2:#1d6299;
    --c-bg:#eef1f5; --c-card:#fff; --c-line:#e2e6ec;
    --c-text:#1f2937; --c-muted:#6b7280; --c-ok:#16a34a; --c-warn:#ea580c;
    --c-err:#dc2626; --c-purple:#7c3aed; --radius:12px;
    --c-teal:#0d9488; --c-teal-bg:#f0fdfa;
  }
```

Ganti dengan (token lama dipertahankan semua, token baru ditambah setelahnya):

```css
  :root{
    --c-primary:#1565c0; --c-head1:#16456e; --c-head2:#1d6299;
    --c-bg:#eef1f5; --c-card:#fff; --c-line:#e2e6ec;
    --c-text:#1f2937; --c-muted:#6b7280; --c-ok:#16a34a; --c-warn:#ea580c;
    --c-err:#dc2626; --c-purple:#7c3aed; --radius:12px;
    --c-teal:#0d9488; --c-teal-bg:#f0fdfa;
    /* Broadsheet (kerangka rail-nav baru — dipakai HANYA oleh .rail/.app-main di
       bawah, BUKAN oleh CSS layar lama, sampai layar-layar itu direstyle sendiri) */
    --bs-bg:#f3f2f2; --bs-ink:#201e1d; --bs-paper:#fff;
    --bs-ac:#0088b0; --bs-ac7:#006786; --bs-ac1:#e9f8ff;
    --bs-a2:#d6006c; --bs-n200:#eae7e7; --bs-n400:#bab6b6; --bs-n600:#7d7979; --bs-n700:#605d5d;
    --bs-fh:'Source Serif 4',Georgia,serif;
  }
```

- [ ] **Step 3: Ubah `.wrap`, tambah CSS rail**

Cari baris ini di `index.html` (~baris 37):

```css
  .wrap{padding:14px;max-width:1180px;margin:0 auto}
```

Ganti dengan:

```css
  .wrap{padding:14px;max-width:1180px;margin:0}
```

Lalu cari blok ini (baris CSS untuk tab lama, tepat sebelum bagian `.wrap`/saldo-summary CSS — cari teks persis ini):

```css
  .tabs{display:flex;background:#123a5e;position:sticky;top:52px;z-index:15}
  .tabs button{flex:1;border:0;background:none;padding:12px 6px;font-size:14px;
    color:rgba(255,255,255,.7);font-weight:600;border-bottom:3px solid transparent}
  .tabs button.active{color:#fff;border-bottom-color:#f6c343}
```

Ganti dengan (blok lama dipertahankan seluruhnya — CSS ini jadi tidak terpakai markup baru
tapi tidak mengganggu apa pun, aman dibiarkan — lalu tambah aturan rail baru setelahnya):

```css
  .tabs{display:flex;background:#123a5e;position:sticky;top:52px;z-index:15}
  .tabs button{flex:1;border:0;background:none;padding:12px 6px;font-size:14px;
    color:rgba(255,255,255,.7);font-weight:600;border-bottom:3px solid transparent}
  .tabs button.active{color:#fff;border-bottom-color:#f6c343}

  /* ===== Rail-nav desktop (kerangka, gaya Broadsheet) ===== */
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

- [ ] **Step 4: Ganti markup topbar/tabs jadi rail**

Cari blok ini di `index.html` (baris 257-277):

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
  <div class="rail-saldo saldo-pill"><div class="l">Saldo</div><div class="v" id="saldoPill">-</div></div>
  <button id="btnUsers" class="rail-item hidden" onclick="openModalUsers()">Kelola User</button>
  <button id="btnSettings" class="rail-item hidden" onclick="openModalSettings()">Pengaturan</button>
  <button id="btnLogout" class="rail-item" onclick="doLogout()">Keluar</button>
</nav>
<div class="app-main">
```

Catatan: pembuka `<div class="app-main">` di atas SENGAJA tidak ditutup di step ini — 6 `<div
id="view...">` yang sudah ada (dimulai tepat setelah blok ini, `<!-- TAB TRANSAKSI -->` dst.)
kini otomatis jadi anak dari `.app-main` tanpa perlu disalin/dipindah. Penutupnya ditambahkan
di Step 5.

- [ ] **Step 5: Tutup `.app-main` setelah `viewDana`**

Cari blok ini di `index.html` (akhir `viewDana`, tepat sebelum komentar modal — ini urutan DOM
asli, `viewDana` adalah kontainer layar TERAKHIR sebelum bagian modal, BUKAN `viewRekon`):

```html
  <div id="dnRingkas" class="kk" style="margin-bottom:12px"></div>
  <div id="dnList"></div>
</div>

<!-- ================= MODAL IMPOR PAGU ================= -->
```

Ganti dengan (satu baris penutup `.app-main` disisipkan tepat sebelum komentar modal):

```html
  <div id="dnRingkas" class="kk" style="margin-bottom:12px"></div>
  <div id="dnList"></div>
</div>

</div><!-- /.app-main -->

<!-- ================= MODAL IMPOR PAGU ================= -->
```

- [ ] **Step 6: Perbaiki selector `_applyRoleUI()` yang bergantung pada `.topbar` yang dihapus**

Ditemukan saat menulis rencana ini (lihat Global Constraints): `_applyRoleUI()` memakai
`.topbar .saldo-pill` untuk menyembunyikan saldo dari akun peran `viewer` — kontrol akses,
bukan kosmetik. Karena `.topbar` dihapus total oleh Step 4, selector ini perlu diperbaiki
supaya perilaku itu tidak diam-diam hilang (elemen barunya sudah membawa kelas `saldo-pill`
juga, lihat markup `<div class="rail-saldo saldo-pill">` di Step 4).

Cari baris ini di `index.html` (~baris 1647, satu-satunya kemunculan `.topbar .saldo-pill`):

```js
  var sp=document.querySelector('.topbar .saldo-pill'); if(sp) sp.style.display=isViewer?'none':'';
```

Ganti dengan:

```js
  var sp=document.querySelector('.saldo-pill'); if(sp) sp.style.display=isViewer?'none':'';
```

Baris `_applyRoleUI()` lainnya (`.saldo-sum`, `btnUsers`, `btnSettings`) tidak berubah — hanya
satu baris ini yang bergantung pada `.topbar` yang dihapus.

- [ ] **Step 7: Cek sintaks**

Run: `node -e "require('fs').readFileSync('index.html','utf8'); console.log('OK')"`
Expected: `OK`

Run cek jumlah tag pembuka/penutup `.app-main` seimbang (harus tepat 1 pembuka dan 1 penutup):
Run: `grep -c 'class="app-main"' index.html`
Expected: `1`
Run: `grep -c '/\.app-main' index.html`
Expected: `1`

Run cek selector `_applyRoleUI()` sudah diperbaiki dan elemen saldo baru membawa kelas yang
dicarinya:
Run: `grep -c "querySelector('.topbar .saldo-pill')" index.html`
Expected: `0`
Run: `grep -c "querySelector('.saldo-pill')" index.html`
Expected: `1`
Run: `grep -c 'class="rail-saldo saldo-pill"' index.html`
Expected: `1`

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
feat(desktop): kerangka rail-nav menggantikan tab atas

Termasuk perbaikan selector _applyRoleUI() (.topbar .saldo-pill ->
.saldo-pill) supaya saldo tetap tersembunyi untuk akun peran viewer
setelah .topbar dihapus -- ditemukan saat menulis rencana ini.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01RSUfSs6GrLV1T58R1rHKJF
EOF
)"
```

---

### Task 2: Verifikasi klik nyata

**Files:**
- Create (sementara, di scratchpad, TIDAK dikomit ke repo): `/tmp/kt-railnav-verify.js`

**Interfaces:**
- Consumes: `index.html` hasil Task 1 apa adanya (dibaca dari disk).

- [ ] **Step 1: Tulis skrip verifikasi Playwright**

Buat file `/tmp/kt-railnav-verify.js`:

```js
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

async function main(){
  var html = fs.readFileSync('/home/user/kas-tunai/index.html', 'utf8');

  var browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  var page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  var pageErrors = [];
  page.on('pageerror', function(err){ pageErrors.push(String(err)); });
  page.on('console', function(msg){ if (msg.type() === 'error') pageErrors.push(msg.text()); });

  // index.html memanggil google.script.run saat termuat (login/dashboard) --
  // stub minimal supaya halaman tidak macet di awal render, tanpa perlu
  // menyimulasikan login sungguhan (rail-nav tidak butuh state login untuk
  // diverifikasi, cukup markup+switchTab-nya).
  await page.addInitScript(function(){
    window.google = { script: { run: new Proxy({}, { get: function(target, prop){
      if (prop in target) return target[prop];
      var api = {};
      api.withSuccessHandler = function(){ return api; };
      api.withFailureHandler = function(){ return api; };
      return function(){ return api; };
    }}) } };
  });

  await page.setContent(html, { waitUntil: 'load' });

  var hasil = {};

  // 1. Saat dimuat: viewTransaksi terlihat, tabTransaksi aktif, 5 layar lain tersembunyi.
  hasil.defaultTransaksi = await page.evaluate(function(){
    var vt = document.getElementById('viewTransaksi');
    var tt = document.getElementById('tabTransaksi');
    var lainTersembunyi = ['viewSpd','viewLaporan','viewRekon','viewPajak','viewDana'].every(function(id){
      return document.getElementById(id).classList.contains('hidden');
    });
    return !vt.classList.contains('hidden') && tt.classList.contains('active') && lainTersembunyi;
  });

  // 2-7. Klik nyata satu-satu ke 6 tombol rail, pastikan layar yang benar tampil.
  var peta = [
    ['tabSpd','viewSpd'], ['tabLaporan','viewLaporan'], ['tabPajak','viewPajak'],
    ['tabDana','viewDana'], ['tabRekon','viewRekon'], ['tabTransaksi','viewTransaksi']
  ];
  hasil.klikSemuaMenu = true;
  for (var i=0;i<peta.length;i++){
    var tombolId = peta[i][0], layarId = peta[i][1];
    await page.click('#' + tombolId);
    var ok = await page.evaluate(function(args){
      var semuaId = ['viewTransaksi','viewSpd','viewLaporan','viewRekon','viewPajak','viewDana'];
      var layarBenar = !document.getElementById(args.layarId).classList.contains('hidden');
      var lainSembunyi = semuaId.filter(function(id){ return id !== args.layarId; })
        .every(function(id){ return document.getElementById(id).classList.contains('hidden'); });
      var tombolAktif = document.getElementById(args.tombolId).classList.contains('active');
      return layarBenar && lainSembunyi && tombolAktif;
    }, { tombolId: tombolId, layarId: layarId });
    if (!ok) { hasil.klikSemuaMenu = false; console.log('  gagal pada: ' + tombolId + ' -> ' + layarId); }
  }

  // 8. Tombol admin (btnUsers/btnSettings) tetap berkelas hidden secara default.
  hasil.tombolAdminTersembunyi = await page.evaluate(function(){
    return document.getElementById('btnUsers').classList.contains('hidden')
      && document.getElementById('btnSettings').classList.contains('hidden');
  });

  // 9. Tidak ada teks "Papan kerja"/"Pagu & realisasi" di mana pun (scope creep check).
  hasil.tanpaScopeCreep = await page.evaluate(function(){
    var teks = document.body.innerText;
    return teks.indexOf('Papan kerja') === -1 && teks.indexOf('Pagu & realisasi') === -1;
  });

  // 10. Pemindaian onclick/onchange menyeluruh pada rail + layar yang baru saja aktif.
  hasil.semuaOnclickValid = await page.evaluate(function(){
    var els = document.querySelectorAll('.rail [onclick]');
    var gagal = [];
    for (var i=0;i<els.length;i++){
      var attr = els[i].getAttribute('onclick');
      try { new Function(attr); } catch(e){ gagal.push(attr + ' :: ' + e.message); }
    }
    return gagal.length === 0 ? true : gagal;
  });

  // 11. _applyRoleUI() masih menyembunyikan saldo untuk akun peran viewer setelah
  // .topbar dihapus (Step 6 Task 1) -- ini kontrol akses, bukan kosmetik, jadi
  // wajib diverifikasi eksplisit, bukan cuma "tidak error".
  hasil.saldoTersembunyiUntukViewer = await page.evaluate(function(){
    isViewer = true;
    _applyRoleUI();
    var sp = document.querySelector('.saldo-pill');
    return !!sp && sp.style.display === 'none';
  });
  hasil.saldoTampilUntukNonViewer = await page.evaluate(function(){
    isViewer = false;
    _applyRoleUI();
    var sp = document.querySelector('.saldo-pill');
    return !!sp && sp.style.display !== 'none';
  });

  hasil.tanpaPageError = pageErrors.length === 0 ? true : pageErrors;

  await browser.close();

  var semuaLolos = true;
  Object.keys(hasil).forEach(function(k){
    var v = hasil[k];
    var lolos = (v === true);
    if (!lolos) semuaLolos = false;
    console.log((lolos ? 'PASS' : 'FAIL') + '  ' + k + (lolos ? '' : ('  -> ' + JSON.stringify(v))));
  });
  process.exit(semuaLolos ? 0 : 1);
}

main().catch(function(e){ console.error(e); process.exit(1); });
```

- [ ] **Step 2: Jalankan skrip**

Run: `node /tmp/kt-railnav-verify.js`

Expected: 8 baris `PASS` (`defaultTransaksi`, `klikSemuaMenu`, `tombolAdminTersembunyi`,
`tanpaScopeCreep`, `semuaOnclickValid`, `saldoTersembunyiUntukViewer`,
`saldoTampilUntukNonViewer`, `tanpaPageError`), exit code 0.

- [ ] **Step 3: Bila ada `FAIL`, perbaiki lalu jalankan ulang**

Baca pesan `-> ...` untuk tahu skenario mana yang gagal. Sebelum mengubah `index.html`,
pertimbangkan dulu apakah kegagalan itu bug pada `index.html` (Task 1) atau bug pada skrip
verifikasi ini sendiri — proyek ini punya riwayat skrip verifikasi ad-hoc yang salah asumsi
(lihat catatan di `docs/HANDOFF-MOBILE.md`/`docs/superpowers/plans/2026-07-28-*.md` sesi-sesi
sebelumnya). Perbaiki yang benar-benar salah, lalu jalankan ulang
`node /tmp/kt-railnav-verify.js` sampai semua `PASS`. Bila perbaikan menyentuh `index.html`,
commit terpisah dengan pesan yang menjelaskan skenario yang diperbaiki.

- [ ] **Step 4: Hapus skrip sementara**

Run: `rm /tmp/kt-railnav-verify.js`

(Tidak ada commit di task ini bila semua langsung `PASS` — tidak ada perubahan `index.html`
yang perlu, skrip ini murni bukti, bukan bagian dari produk.)

---

## Self-Review

**1. Cakupan spesifikasi** (`docs/superpowers/specs/2026-07-28-desktop-rail-nav-design.md`):
- Bagian 1 (struktur HTML) → Task 1 Step 4-5.
- Bagian 2 (CSS) → Task 1 Step 1-3.
- Bagian 3 (JavaScript) → tidak ada task terpisah karena spec sendiri menyatakan
  `switchTab()` tidak berubah — dicatat sebagai Global Constraint dan diverifikasi lewat
  Task 2 (klik nyata membuktikan routing lama tetap berfungsi tanpa modifikasi).
- Bagian 4 (kasus tepi) → Task 2 skenario `tombolAdminTersembunyi`, `tanpaScopeCreep`,
  `defaultTransaksi`.
- Bagian 5 (rencana uji, 6 skenario spec) → Task 2, dipetakan 1:1 ke kunci `hasil`
  (skenario 1 `defaultTransaksi`; skenario 2 `klikSemuaMenu`, mencakup data-tidak-hilang
  secara implisit karena `switchTab` cuma toggle visibility, tidak membongkar DOM — tidak
  ada langkah yang menghapus/reset isi `viewTransaksi` dkk; skenario 4 `tombolAdminTersembunyi`;
  skenario 5 `semuaOnclickValid`; skenario 6 `tanpaScopeCreep`).

Tidak ada bagian spec yang tanpa task.

**2. Pemindaian placeholder**: tidak ada "TBD"/"implement later"/"similar to Task N" — setiap
step berisi kode lengkap siap tempel, disalin verbatim dari spec yang sudah disetujui pengguna.

**3. Konsistensi tipe/nama**: seluruh `id` (`tabTransaksi`, `viewTransaksi`, dst.) identik
dengan yang sudah dipakai `switchTab()` — tidak ada nama baru yang perlu diselaraskan lintas
task karena Task 1 adalah satu-satunya task yang mengubah kode produk, Task 2 murni membaca.

**4. Temuan tambahan di luar spec asli (ditambahkan setelah spec ditulis)**: eksplorasi lebih
dalam saat menyusun rencana ini menemukan `_applyRoleUI()` (`index.html:1645-1650`) bergantung
pada `.topbar .saldo-pill` untuk menyembunyikan saldo dari akun peran `viewer` — kontrol akses
yang tidak disebutkan spec sama sekali, dan akan diam-diam rusak (bukan error, tapi regresi
keamanan/privasi) begitu `.topbar` dihapus Task 1. Ditambahkan sebagai Global Constraint,
Task 1 Step 6 (perbaikan satu baris), dan dua skenario baru di Task 2
(`saldoTersembunyiUntukViewer`/`saldoTampilUntukNonViewer`). Ini SATU-SATUNYA penyimpangan dari
"JS tidak diubah" di seluruh rencana, dan alasannya dicatat eksplisit di setiap tempat yang
relevan supaya tidak terlihat seperti pelanggaran cakupan yang tidak disengaja.

---

## Execution Handoff

Rencana selesai dan tersimpan di `docs/superpowers/plans/2026-07-28-desktop-rail-nav.md`. Dua opsi eksekusi:

1. **Subagent-Driven (rekomendasi)** — subagent baru per tugas, review dua tahap di antara tugas, iterasi cepat.
2. **Inline Execution** — eksekusi tugas demi tugas di sesi ini, batch dengan checkpoint untuk direview.

Mana yang dipilih?
