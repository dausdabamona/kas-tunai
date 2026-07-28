# Desain: Parser GLP039 (Client-Side, Fungsi Murni)

## Konteks

Tugas urutan-2 dari `docs/HANDOFF-DESKTOP.md` rev-2 (nomor asli tugas 7 di papan
status). Fondasi untuk seluruh fitur Pagu & Realisasi (Bagian III) — membaca file
Excel **GLP039** (Laporan Ketersediaan Dana Detail, ekspor dari SAKTI) di **browser**
(bukan Apps Script) dan menghasilkan data terstruktur siap pakai.

**Cakupan tugas ini: HANYA fungsi parsernya + uji mandiri (self-test).** Layar
"Unggah GLP039" (memakai parser ini, drag-drop, tampilan hasil baca) adalah tugas
urutan-8 TERPISAH — tidak disentuh di sini, sesuai pemisahan yang sudah ada di papan
status `docs/HANDOFF-DESKTOP.md`.

Rujukan wajib (jangan diulang di sini, dibaca sebagai bagian dari spec ini):
- `docs/HANDOFF-DESKTOP.md` bagian 4 (format file, hierarki 8 level, kolom nilai,
  rumus, angka acuan uji) — **sumber kebenaran** untuk semua aturan bisnis.
- `docs/HANDOFF-DESKTOP.md` bagian 0 temuan A-D, dan bagian 7 (struktur & pengujian).
- Data acuan 410 baris (dari paket desain pengguna, path sesi:
  `contoh-data/glp039-baris-terbaca.txt`) — **ini rendering hasil baca yang SUDAH
  diekstrak, BUKAN file `.xlsx` mentah**. Dipakai untuk menguji lapisan bisnis
  (Bagian 3) secara penuh terhadap angka nyata. Tidak ada file `.xlsx` GLP039 asli
  yang tersedia untuk sesi ini — lihat Bagian 5 untuk konsekuensinya pada cakupan uji.

## Keputusan yang sudah disetujui pengguna (lewat `AskUserQuestion`/persetujuan langsung, 28 Jul 2026)

| Topik | Keputusan |
|---|---|
| Cakupan uji tanpa file `.xlsx` asli | **Uji logika bisnis penuh** (Bagian 3, terhadap 410 baris data acuan sungguhan) **+ uji unzip/XML minimal** (Bagian 1-2, dengan ZIP/XML buatan sendiri yang meniru ciri-ciri terdokumentasi — BUKAN file SAKTI asli). Dicatat eksplisit di kode bahwa lapisan unzip/XML belum pernah diuji dengan file SAKTI sungguhan — wajib dicoba pertama kali dengan file asli sebelum dipakai produksi (di tugas urutan-8, layar Unggah). |
| Struktur parser | **Tiga lapisan fungsi murni terpisah**, bukan satu fungsi besar: `_unzipSheet` (baca ZIP) → `_parseSheetXml` (uraikan XML jadi baris mentah) → `_turunkanHierarki` (logika bisnis: hierarki + rumus). `parseGlp039` cuma merangkai ketiganya. |
| Gaya kode untuk bagian async | **Promise dengan `.then()`**, BUKAN `async`/`await` — karena `DecompressionStream` inheren asinkron, tapi seluruh `index.html` lainnya memakai gaya `var`+`function`+callback tanpa `async`/`await`. Hanya `_unzipSheet` dan `parseGlp039` yang mengembalikan Promise (lapisan 2 dan 3 tetap sinkron biasa). |
| Cara baca XML | **Uraikan teks manual (regex/pemindaian string), BUKAN `DOMParser`.** Dua alasan: (1) "fungsi murni tanpa DOM" ditafsirkan ketat — tidak memakai API terkait DOM sama sekali, bukan cuma "tidak menyentuh elemen halaman"; (2) `DOMParser` tidak ada di Node.js polos, jadi memakainya akan memaksa seluruh uji mandiri lewat browser (Playwright) — sedangkan `DecompressionStream`/`TextDecoder`/`DataView`/`Uint8Array` semuanya tersedia juga di Node modern, jadi dengan pemindaian manual, **seluruh self-test bisa dijalankan lewat `node script.js` biasa**, tanpa browser sama sekali. |
| Skema field "uraian" di baris hasil | **`uraian` tetap sesuai dokumen** (nama Item POK, level paling spesifik) — TIDAK diubah/dihapus. **Ditambah** `programUraian`/`kegiatanUraian`/`kroUraian`/`roUraian`/`komponenUraian`/`subkomponenUraian`/`akunUraian` di tiap baris — supaya tabel pohon (tugas urutan-3) tidak perlu pencarian/lookup terpisah untuk label tiap tingkat. Ini perluasan skema dari `docs/HANDOFF-DESKTOP.md`, bukan penyimpangan — field yang sudah didokumentasikan tidak diubah maknanya. |
| Angka acuan "38 akun" vs hasil nyata (40) | **Pakai 38 apa adanya** di `docs/HANDOFF-DESKTOP.md` — TIDAK diubah. Ditemukan lewat menjalankan logika Bagian 3 sungguhan terhadap 410 baris data acuan (bukan cuma dibaca): jumlah kode akun (kolom H) yang benar-benar berbeda di data contoh adalah **40**, diverifikasi dua cara independen (hitung langsung dari teks mentah, dan lewat `_turunkanHierarki`). Selisihnya **belum terjelaskan** — bukan disebabkan bug yang ditemukan (lihat baris berikutnya, itu perkara terpisah). Self-test (Bagian 5) mencatat angka `jumlahAkun` yang sebenarnya keluar, TIDAK menjadikannya syarat lolos/gagal keras seperti angka acuan lain (pagu/realisasi/sisa/serapan/program) yang SUDAH cocok persis. |
| Baris "N=Jurnal" di data acuan (baris 139) | **Bukan kesalahan parser — artifak dari cara berkas contoh diekstrak jadi teks.** Baris ini (`N=Jurnal, Q=3.600.000`) adalah kelanjutan uraian item sebelumnya ("000116. Honorarium Komite Penilaian dan/atau Review... Jurnal", nilai Q sama persis) yang terpisah jadi dua baris "R" saat rendering hasil-baca dibuat — bukan struktur asli XLSX (satu sel Excel tidak pernah terpecah jadi dua baris XML `<row>` terpisah, berapa pun panjang teksnya). Dikonfirmasi dengan menjalankan `_turunkanHierarki` terhadap data acuan: baris ini menyebabkan total pagu hasil hitung (Rp 20.377.520.000) meleset persis Rp 3.600.000 dari angka "JUMLAH SELURUHNYA" berkas (Rp 20.373.920.000). Skrip konversi teks-acuan-ke-`rawRows` di self-test (Bagian 5a) menyaring baris `N=` yang tidak berpola `NNNNNN. <uraian>` sebagai artifak ekstraksi, dengan komentar yang menjelaskan alasan ini — **bukan** logika yang masuk ke parser produksi (parser produksi tidak butuh aturan ini sama sekali, karena XML asli tidak punya masalah ini). |

## Bagian 1 — Lapisan unzip: `_unzipSheet(arrayBuffer)`

Mengembalikan `Promise<{sheetXml: string, sharedStringsXml: string|null}>`. Membaca
struktur ZIP standar (End of Central Directory → Central Directory → Local File
Header) tanpa pustaka eksternal, sesuai larangan JSZip di `docs/HANDOFF-DESKTOP.md`.

```js
function _unzipSheet(arrayBuffer){
  var view = new DataView(arrayBuffer);
  var bytes = new Uint8Array(arrayBuffer);
  function u32(off){ return view.getUint32(off, true); }
  function u16(off){ return view.getUint16(off, true); }

  // 1. Cari End Of Central Directory (EOCD) -- mundur dari akhir berkas, karena
  // arsip bisa punya komentar variabel di ujung sebelum penanda ini.
  var EOCD_SIG = 0x06054b50;
  var minOff = Math.max(0, bytes.length - 22 - 65536);
  var eocdOff = -1;
  for (var i = bytes.length - 22; i >= minOff; i--){
    if (u32(i) === EOCD_SIG){ eocdOff = i; break; }
  }
  if (eocdOff < 0) throw new Error('Berkas bukan ZIP/XLSX yang valid -- penanda akhir arsip (EOCD) tidak ditemukan.');

  var cdOffset = u32(eocdOff + 16);
  var cdSize = u32(eocdOff + 12);
  var numEntries = u16(eocdOff + 10);

  // 2. Baca Central Directory, kumpulkan entri yang dibutuhkan saja.
  var CD_SIG = 0x02014b50;
  var entries = {};
  var pos = cdOffset;
  for (var e = 0; e < numEntries; e++){
    if (u32(pos) !== CD_SIG) throw new Error('Struktur ZIP tidak dikenali di entri ke-' + e + ' (bukan XLSX standar).');
    var method = u16(pos + 10);
    var compSize = u32(pos + 20);
    var nameLen = u16(pos + 28);
    var extraLen = u16(pos + 30);
    var commentLen = u16(pos + 32);
    var localOffset = u32(pos + 42);
    var name = _bytesToAscii(bytes, pos + 46, nameLen);
    if (name === 'xl/worksheets/sheet1.xml' || name === 'xl/sharedStrings.xml'){
      entries[name] = { method: method, compSize: compSize, localOffset: localOffset };
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  if (!entries['xl/worksheets/sheet1.xml']) throw new Error('Berkas tidak berisi xl/worksheets/sheet1.xml -- kemungkinan bukan file GLP039/XLSX yang benar.');

  // 3. Ambil data tiap entri lewat Local File Header, bongkar bila terkompresi.
  function ekstrak(entry){
    var lp = entry.localOffset;
    if (u32(lp) !== 0x04034b50) throw new Error('Header lokal ZIP rusak di offset ' + lp + '.');
    var nameLen2 = u16(lp + 26), extraLen2 = u16(lp + 28);
    var dataStart = lp + 30 + nameLen2 + extraLen2;
    var raw = bytes.slice(dataStart, dataStart + entry.compSize);
    if (entry.method === 0) return Promise.resolve(raw);          // stored, tanpa kompresi
    if (entry.method !== 8) return Promise.reject(new Error('Metode kompresi ZIP tidak didukung (' + entry.method + ') -- hanya stored/deflate.'));
    var ds = new DecompressionStream('deflate-raw');
    var stream = new Blob([raw]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function(buf){ return new Uint8Array(buf); });
  }

  var dec = new TextDecoder('utf-8');
  return ekstrak(entries['xl/worksheets/sheet1.xml']).then(function(sheetBytes){
    var sheetXml = dec.decode(sheetBytes);
    if (!entries['xl/sharedStrings.xml']) return { sheetXml: sheetXml, sharedStringsXml: null };
    return ekstrak(entries['xl/sharedStrings.xml']).then(function(ssBytes){
      return { sheetXml: sheetXml, sharedStringsXml: dec.decode(ssBytes) };
    });
  });
}
function _bytesToAscii(bytes, start, len){
  var s = '';
  for (var i = 0; i < len; i++) s += String.fromCharCode(bytes[start + i]);
  return s;
}
```

**Catatan implementasi**: `Blob`/`Response`/`DecompressionStream` semuanya tersedia
baik di browser Chrome modern maupun Node.js versi baru (dipakai lewat `node
script.js` biasa untuk self-test, lihat Bagian 5) — tidak perlu Playwright untuk
menguji lapisan ini.

## Bagian 2 — Lapisan uraikan XML: `_parseSheetXml` + `_parseSharedStrings`

Mengembalikan array baris mentah `{rowNum: number, cells: {KOL: nilai}}`. Sinkron
biasa (bukan Promise). Menangani DUA bentuk teks sel: `t="inlineStr"` (teks langsung
di sel) dan `t="s"` (rujukan indeks ke `sharedStrings.xml`) — **wajib keduanya**,
sesuai temuan rev-2 (jangan asumsikan cuma salah satu bentuk yang akan muncul).

```js
function _parseSheetXml(sheetXml, sharedStringsXml){
  var shared = sharedStringsXml ? _parseSharedStrings(sharedStringsXml) : null;
  var rows = [];
  var rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  var m;
  while ((m = rowRe.exec(sheetXml))){
    var rowNum = +m[1], body = m[2], cells = {};
    var cellRe = /<c r="([A-Z]+)\d+"([^>]*)\/>|<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
    var cm;
    while ((cm = cellRe.exec(body))){
      var selfClosing = !!cm[1];
      if (selfClosing) continue;                       // sel kosong, lewati
      var col = cm[3], attrs = cm[4], inner = cm[5];
      var typeM = /\bt="([a-z]+)"/.exec(attrs);
      var type = typeM ? typeM[1] : null;
      var value;
      if (type === 's'){
        var idxM = /<v>(\d+)<\/v>/.exec(inner);
        var idx = idxM ? +idxM[1] : -1;
        if (idx < 0 || !shared || idx >= shared.length)
          throw new Error('Rujukan teks bersama (sharedStrings) tidak ditemukan untuk sel ' + col + rowNum + '.');
        value = shared[idx];
      } else if (type === 'inlineStr'){
        var tM = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
        value = tM ? _decodeXmlEntities(tM[1]) : '';
      } else {
        var vM = /<v>([^<]*)<\/v>/.exec(inner);
        value = vM && vM[1] !== '' ? parseFloat(vM[1]) : null;
      }
      cells[col] = value;
    }
    rows.push({ rowNum: rowNum, cells: cells });
  }
  return rows;
}
function _parseSharedStrings(xml){
  var out = [];
  var siRe = /<si>([\s\S]*?)<\/si>/g, m;
  while ((m = siRe.exec(xml))){
    var text = '', tRe = /<t[^>]*>([\s\S]*?)<\/t>/g, tm;
    while ((tm = tRe.exec(m[1]))) text += tm[1];
    out.push(_decodeXmlEntities(text));
  }
  return out;
}
function _decodeXmlEntities(s){
  return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}
```

Apakah bagian ini sudah sesuai (menambahkan detail teknis pada Bagian 1-2 yang
sudah Anda setujui secara konsep)?

## Bagian 3 — Lapisan turunkan hierarki: `_turunkanHierarki(rawRows)`

Sinkron, mengembalikan `{rows, ringkasan, peringatan}`. Menelusuri baris dari atas
ke bawah, menyimpan "konteks saat ini" per tingkat hierarki (Program/Kegiatan/KRO/
RO/Komponen/SubKomponen/Akun) — begitu baris berisi kolom N (Item POK), satu baris
hasil diterbitkan dengan SELURUH jalur hierarki di atasnya + nilai baris itu sendiri.

```js
function _turunkanHierarki(rawRows){
  var ctx = { program:null, programUraian:null, kegiatan:null, kegiatanUraian:null,
    kro:null, kroUraian:null, ro:null, roUraian:null, komponen:null, komponenUraian:null,
    subkomponen:null, subkomponenUraian:null, akun:null, akunUraian:null };
  var out = [], peringatan = [];
  var totalBaris = 'JUMLAH SELURUHNYA';
  var ringkasanRow = null;
  var akunSet = {}, programSet = {};

  for (var i = 0; i < rawRows.length; i++){
    var c = rawRows[i].cells;
    if (c.A === totalBaris){ ringkasanRow = c; continue; }
    if (c.Q === undefined || c.Q === null) continue;   // baris tanpa Q = catatan kaki/kosong, lewati

    if (c.B != null){
      if (String(c.B).indexOf('.') < 0){ ctx.program = c.B; ctx.programUraian = c.D || ''; }
      else { ctx.kegiatan = c.B; ctx.kegiatanUraian = c.I || ''; }
    }
    if (c.C != null){
      if (String(c.C).indexOf('.') < 0){ ctx.kro = c.C; ctx.kroUraian = c.G || ''; }
      else { ctx.ro = c.C; ctx.roUraian = c.K || ''; }
    }
    if (c.E != null){ ctx.komponen = c.E; ctx.komponenUraian = c.J || ''; }
    if (c.F != null){ ctx.subkomponen = c.F; ctx.subkomponenUraian = c.L || ''; }
    if (c.H != null){ ctx.akun = c.H; ctx.akunUraian = c.M || ''; }

    if (c.N != null){
      if (!ctx.akun){
        peringatan.push('Baris ' + rawRows[i].rowNum + ': item POK "' + c.N + '" tanpa kode akun yang dikenali -- dilewati.');
        continue;
      }
      var realSd = (c.Y !== undefined && c.Y !== null) ? c.Y : c.Z;
      out.push({
        program: ctx.program, programUraian: ctx.programUraian,
        kegiatan: ctx.kegiatan, kegiatanUraian: ctx.kegiatanUraian,
        kro: ctx.kro, kroUraian: ctx.kroUraian,
        ro: ctx.ro, roUraian: ctx.roUraian,
        komponen: ctx.komponen, komponenUraian: ctx.komponenUraian,
        subkomponen: ctx.subkomponen, subkomponenUraian: ctx.subkomponenUraian,
        akun: ctx.akun, akunUraian: ctx.akunUraian,
        item: c.N, uraian: c.N,
        pagu: Math.round(c.Q || 0), lock: Math.round(c.S || 0),
        realLalu: Math.round(c.W || 0), realIni: Math.round(c.X || 0),
        realSd: Math.round(realSd || 0)
      });
      akunSet[ctx.akun] = true;
      if (ctx.program) programSet[ctx.program] = true;
    }
  }

  if (!ringkasanRow) throw new Error('Baris "JUMLAH SELURUHNYA" tidak ditemukan -- struktur berkas tidak sesuai format GLP039 yang dikenali.');

  var totalPaguHitung = 0;
  for (var j = 0; j < out.length; j++) totalPaguHitung += out[j].pagu;
  var totalPaguBerkas = Math.round(ringkasanRow.Q || 0);
  if (totalPaguHitung !== totalPaguBerkas){
    peringatan.push('Total pagu hasil hitung ulang (Rp ' + totalPaguHitung.toLocaleString('id-ID') +
      ') tidak persis sama dengan angka "JUMLAH SELURUHNYA" di berkas (Rp ' + totalPaguBerkas.toLocaleString('id-ID') + ').');
  }

  var realSdTotal = (ringkasanRow.Y !== undefined && ringkasanRow.Y !== null) ? ringkasanRow.Y : ringkasanRow.Z;
  return {
    rows: out,
    ringkasan: {
      pagu: totalPaguBerkas,
      realisasiSd: Math.round(realSdTotal || 0),
      serapan: totalPaguBerkas > 0 ? (realSdTotal / totalPaguBerkas) : 0,
      sisa: Math.round((ringkasanRow.AD !== undefined ? ringkasanRow.AD : 0) || 0),
      jumlahBaris: out.length,
      jumlahProgram: Object.keys(programSet).length,
      jumlahAkun: Object.keys(akunSet).length
    },
    peringatan: peringatan
  };
}
```

Apakah logika Bagian 3 ini sudah sesuai?

## Bagian 4 — Fungsi gabungan `parseGlp039` + penanganan galat

```js
function parseGlp039(arrayBuffer){
  return _unzipSheet(arrayBuffer).then(function(hasil){
    var rawRows = _parseSheetXml(hasil.sheetXml, hasil.sharedStringsXml);
    return _turunkanHierarki(rawRows);
  });
}
```

**Berhenti total (`throw`/Promise `reject`)** — kondisi yang membuat hasil PASTI
salah bila dipaksa lanjut:
- ZIP tidak valid / `sheet1.xml` tidak ditemukan (Bagian 1).
- Sel merujuk `sharedStrings` tapi daftarnya tidak ada atau indeksnya di luar
  jangkauan (Bagian 2) — tanpa ini, banyak kode/uraian akan salah/kosong sekaligus.
- Baris "JUMLAH SELURUHNYA" tidak ditemukan (Bagian 3) — pertanda struktur berkas
  beda total dari yang diharapkan.

**Cuma peringatan (`peringatan[]`, tetap lanjut)**:
- Baris item dengan kode akun tak dikenali (dilewati, satu baris tak masuk hasil).
- Total pagu hasil hitung ulang ≠ angka "JUMLAH SELURUHNYA" di berkas (kemungkinan
  pembulatan atau baris terlewat — pengguna yang menilai wajar/tidaknya).

Apakah pembagian ini sudah sesuai?

## Bagian 5 — Rencana uji (self-test, dijalankan lewat `node`, bukan Playwright)

Karena tidak ada file `.xlsx` GLP039 asli, uji dipecah dua:

**5a. Lapisan bisnis (Bagian 3) — diuji PENUH terhadap data nyata, sudah dijalankan
sungguhan saat menulis spec ini (bukan cuma rencana di atas kertas).** Baca
`contoh-data/glp039-baris-terbaca.txt` (409 baris format `R9: A=... | Q=... | ...`),
ubah tiap baris jadi bentuk `{rowNum, cells}` yang sama seperti keluaran
`_parseSheetXml` (parsing baris teks ini sendiri sederhana — pemisah `|`, lalu
`KOLOM=NILAI`; kolom huruf tunggal A-P selalu diperlakukan sebagai teks meski
kelihatan seperti angka, kolom lain di-`parseFloat` bila memungkinkan). **Sebelum**
dikonversi, saring baris `N=` yang TIDAK berpola `^\d{6}\.` (enam digit lalu titik)
— ini artifak baris terpotong pada berkas rendering contoh (lihat baris "Baris
'N=Jurnal'..." di tabel Keputusan), bukan aturan yang dibutuhkan parser produksi.

Hasil aktual (dijalankan lewat `node`, dicocokkan dengan angka acuan
`docs/HANDOFF-DESKTOP.md` bagian 4):

| Angka | Acuan dokumen | Hasil nyata | Status |
|---|---|---|---|
| Pagu | `20.373.920.000` | `20.373.920.000` | ✅ cocok persis |
| Realisasi s.d. Juli | `12.223.943.202` | `12.223.943.202` | ✅ cocok persis |
| Serapan | `60,00%` | `59,998%` (`0.5999799352309226`) | ✅ cocok (pembulatan tampilan) |
| Sisa | `8.149.976.798` | `8.149.976.798` | ✅ cocok persis |
| Jumlah program | `2` | `2` | ✅ cocok persis |
| Jumlah akun | `38` | `40` | ⚠️ **belum terjelaskan** — dicatat, BUKAN syarat lolos/gagal keras (lihat tabel Keputusan) |
| Jumlah baris (item POK) | *(410 baris berkas termasuk header/catatan kaki)* | `238` item POK lolos saringan | Tidak dibandingkan langsung — 410 mencakup baris header/hierarki non-item/catatan kaki, bukan hitungan item POK |

Self-test WAJIB menegakkan baris-baris berstatus ✅ sebagai syarat lolos/gagal keras.
Baris `jumlahAkun` dicatat/di-`console.log` sebagai informasi, TIDAK menggagalkan
self-test sendirian.

**5b. Lapisan unzip + XML (Bagian 1-2) — diuji dengan berkas buatan sendiri**, BUKAN
file SAKTI asli:
- Bangun ZIP minimal berisi `xl/worksheets/sheet1.xml` (metode `stored`, tanpa
  kompresi) berisi 2-3 baris uji dengan campuran `inlineStr` dan rujukan `t="s"`,
  plus `xl/sharedStrings.xml` yang cocok. Jalankan `_unzipSheet` lalu
  `_parseSheetXml`, cocokkan hasilnya dengan nilai yang sengaja ditanam.
- Uji terpisah: kompres satu potong teks dengan `zlib.deflateRawSync` (bawaan
  Node) jadi buffer, taruh dalam entri ZIP bermetode `deflate` (8), pastikan
  `_unzipSheet` (lewat `DecompressionStream`) berhasil membongkarnya kembali jadi
  teks yang sama — membuktikan interop `DecompressionStream` browser dengan deflate
  standar, tanpa perlu file SAKTI asli.
- Uji notasi ilmiah (`<v>2.037392E10</v>`) terbaca sebagai angka yang benar.
- Uji baris catatan kaki (kolom B berisi teks, tanpa Q) dilewati dengan benar.

**5c. Semua kondisi galat di Bagian 4 diuji satu-satu** — pastikan tiap kondisi
`throw` benar-benar terpicu pada input yang sesuai, dan tidak terpicu pada input
yang valid (tidak ada "galat palsu").

**Catatan wajib**: lapisan 5b TIDAK PERNAH diuji dengan file SAKTI sungguhan.
Sebelum dipakai di layar Unggah (tugas urutan-8), WAJIB dicoba dulu dengan file
GLP039 asli dan hasilnya diverifikasi manual oleh PPK sebelum dipercaya untuk data
produksi — ini bukan formalitas, ini karena kesenjangan uji yang diketahui dan
disetujui secara sadar (lihat tabel keputusan di atas).

## Status

Kelima bagian disetujui bertahap oleh pengguna (28 Jul 2026). Langkah berikutnya:
`writing-plans`.
