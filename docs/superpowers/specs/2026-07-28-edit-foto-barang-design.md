# Desain: Edit foto barang (Bukti B) yang sudah tersimpan — Mobile

## Konteks

Layar Detail transaksi (mobile) sudah punya "✎ Ubah" per nota (`bukaNotaUbah`, `mobile.html:1440`),
yang membuka layar `scNota` dan mengizinkan mengubah field nota (nama/NPWP/alamat/nilai/tanggal),
mengganti Bukti A (scan nota, tombol "tukar" yang sudah ada), menambah foto baru, dan menghapus foto
Bukti B satu per satu (`ntHapusFotoServer`). **Yang belum ada**: mengedit foto Bukti B (foto barang)
yang sudah tersimpan di server — baik mengganti gambarnya maupun memberi/mengubah keterangan per
foto (kolom `KETERANGAN` di sheet `FOTO_NOTA` sudah ada, tapi selalu diisi teks baku dari frontend,
tidak pernah diketik pengguna).

Permintaan pengguna, 28 Jul 2026: *"untuk mobile perlu juga edit nota dan edit foto barang"* — bagian
"edit nota" ternyata sudah terpenuhi sepenuhnya oleh fitur yang ada; brainstorming ini fokus pada
bagian yang benar-benar baru: **edit foto barang**.

## Keputusan yang sudah disetujui pengguna (lewat `AskUserQuestion`, bertahap)

| Pertanyaan | Keputusan |
|---|---|
| Cakupan edit foto barang | **Ganti gambar DAN ubah keterangan** (bukan salah satu saja) |
| Tempat mengedit | **Inline di layar Ubah nota** yang sudah ada — bukan layar/overlay baru |
| Kapan tersimpan | **Langsung saat itu juga** — ganti gambar = upload+buang lama seketika; keterangan = tersimpan saat kotak teks kehilangan fokus (blur). Tidak menunggu tombol "Simpan perubahan" nota. |
| Pendekatan teknis ganti gambar | **Input file tersendiri** (`accept="image/*" capture="environment"`), langsung kompres+upload — BUKAN lewat layar Kamera penuh |
| Cakupan foto baru yang belum diunggah | **Di luar cakupan** — foto Bukti B yang baru diambil (belum "Simpan") tetap pakai keterangan baku seperti sekarang; ini sengaja tidak diperluas sekarang |

## Bagian 1 — Backend

**`FotoNota.gs`**: fungsi baru `updateFotoNota(noTransaksi, notaId, urutan, data)`, `data = {keterangan, file}`.

```js
function updateFotoNota(noTransaksi, notaId, urutan, data) {
  var c = FC();
  var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
    return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
           String(r[c.NOTA_ID]) === String(notaId) &&
           String(r[c.URUTAN]) === String(urutan) && !isDeleted(r[c.IS_DELETED]);
  });
  if (!rows.length) throw new Error('Foto nota tidak ditemukan');
  var hit = rows[0];
  var upd = Util.set(c.KETERANGAN, data.keterangan || '');
  if (data.file && data.file.base64) {
    var oldFileId = hit.values[c.FILE_ID];
    var up = DriveHelper.upload(data.file, {noTransaksi: noTransaksi});
    upd[c.FILE_ID] = up.fileId; upd[c.NAMA_FILE] = up.namaFile; upd[c.URL_FILE] = up.url;
    if (oldFileId) DriveHelper.trash(oldFileId);
  }
  SheetRepo.setCells(CONFIG.SHEETS.FOTO_NOTA, hit.rowIndex, upd);
  DeferredFlush.mark();
  return { success: true };
}
```

Tambahkan `updateFotoNota: updateFotoNota` ke object yang dikembalikan `FotoNota.gs` (baris `return { ... }`
di akhir file).

**`Code.gs`**: endpoint baru, pola sama seperti `serverHapusFotoNota`/`serverUploadFotoNota`
(`Code.gs:548-551`):

```js
function serverUpdateFotoNota(token, noTransaksi, notaId, urutan, data) {
  return _run(token, function () { return FotoNota.updateFotoNota(noTransaksi, notaId, urutan, data); });
}
```

Tidak ada kolom sheet baru — `KETERANGAN` sudah ada di skema `FOTO_NOTA` sejak awal (lihat komentar
header `FotoNota.gs:6`).

## Bagian 2 — Frontend: markup

Ganti blok Bukti B di `ntRenderFoto()` (`mobile.html`, saat ini baris ~3302-3305):

```js
// SEBELUM
for (i=0;i<NT.lamaB.length;i++)
  b += '<div class="ph">' + _ntImgDrive(NT.lamaB[i].fileId)
     + '<button class="del" onclick="ntHapusFotoServer('+i+')" aria-label="Hapus">'
     + '<i class="ph-duotone ph-trash"></i></button></div>';
```

```js
// SESUDAH
for (i=0;i<NT.lamaB.length;i++)
  b += '<div class="ph">' + _ntImgDrive(NT.lamaB[i].fileId)
     + '<button class="tukar" onclick="ntGantiFotoB('+i+')">&#8646; ganti</button>'
     + '<button class="del" onclick="ntHapusFotoServer('+i+')" aria-label="Hapus">'
     + '<i class="ph-duotone ph-trash"></i></button>'
     + '<input class="ketFoto" placeholder="Keterangan foto (mis. Paracetamol 40 strip)" '
     +   'value="' + esc(NT.lamaB[i].keterangan||'') + '" '
     +   'onblur="ntSimpanKeteranganB('+i+',this.value)"></div>';
```

`i` adalah indeks array integer murni (pola identik `ntHapusFotoServer(i)`/`ntHapusFoto(jenis,i)` yang
sudah ada di fungsi yang sama) — **bukan** data yang perlu `aq()`.

Tambahkan sekali di markup statis layar nota (dekat elemen `#kmCam`/`#kmGal`):

```html
<input type="file" id="ntGantiBFile" accept="image/*" capture="environment" style="display:none" onchange="_ntGantiFotoBFile(this)">
```

CSS `.tukar` sudah ada (dipakai tombol ganti Bukti A); `.ketFoto` baru, styling ringkas mengikuti pola
input teks lain di layar nota (garis bawah 1px `--n400`, font 13px, padding kecil) — detail piksel
menyusul saat implementasi, ikuti token yang sudah dipakai `.fld input`/sejenisnya di `mobile.html`.

## Bagian 3 — Frontend: alur JS

```js
var _NT_GANTI_B_IDX = null;
function ntGantiFotoB(i){ _NT_GANTI_B_IDX = i; $('ntGantiBFile').click(); }
function _ntGantiFotoBFile(el){
  var file = el.files && el.files[0];
  el.value = '';                          // supaya bisa pilih file yang sama lagi lain kali
  if (!file || _NT_GANTI_B_IDX === null) return;
  var i = _NT_GANTI_B_IDX; _NT_GANTI_B_IDX = null;
  var f = NT.lamaB[i]; if (!f) return;
  var urutanLama = f.urutan;
  kompres(file, function(dataUrl, mime){
    loading(true, 'Mengganti foto…');
    google.script.run
      .withSuccessHandler(function(){
        google.script.run
          .withSuccessHandler(function(res){
            loading(false);
            // serverGetFotoNota mengembalikan ARRAY langsung (bukan {list:...}) —
            // cocokkan lewat field urutan milik foto itu sendiri, JANGAN pakai
            // indeks posisi array: urutan hasil re-fetch tidak dijamin sejajar
            // 1:1 dengan NT.lamaB kalau ada foto lain yang berubah di antaranya.
            var baru = null, k;
            for (k=0; res && k<res.length; k++)
              if (String(res[k].urutan) === String(urutanLama)) { baru = res[k]; break; }
            if (baru) NT.lamaB[i] = baru;
            ntRenderFoto(); toast('Foto diganti');
          })
          .withFailureHandler(function(e){ loading(false); gagal(e); })
          .serverGetFotoNota(_tok, NT.no, NT.urutan);
      })
      .withFailureHandler(function(e){ loading(false); gagal(e); })
      .serverUpdateFotoNota(_tok, NT.no, NT.urutan, urutanLama,
        { keterangan: f.keterangan||'', file: { base64: dataUrl.split(',')[1], mimeType: mime } });
  });
}
function ntSimpanKeteranganB(i, teks){
  var f = NT.lamaB[i]; if (!f) return;
  teks = (teks||'').trim();
  if (teks === (f.keterangan||'')) return;   // tak berubah, jangan panggil server percuma
  f.keterangan = teks;
  google.script.run.withFailureHandler(gagal)
    .serverUpdateFotoNota(_tok, NT.no, NT.urutan, f.urutan, { keterangan: teks, file: null });
}
```

Setelah ganti gambar, `fileId` lokal sudah usang (server sudah punya yang baru) — cara paling aman
menyegarkannya adalah minta ulang daftar foto nota (`serverGetFotoNota`, endpoint yang sudah ada,
`Code.gs:545`) alih-alih mengarang `fileId` baru di klien. **Dikonfirmasi dari kode**:
`serverGetFotoNota(token, noTransaksi, notaId)` mengembalikan **array langsung** (`FotoNota.getFotoNota`,
bukan dibungkus `{list:...}`) — kode di atas mencocokkan hasilnya lewat field `urutan` milik foto,
bukan indeks posisi array, supaya tetap benar walau urutan hasil re-fetch tidak sejajar 1:1.

`kompres()` yang sudah ada dipakai apa adanya — foto ganti tetap dikompres maks 1280px/kualitas 0.7
sama seperti jalur unggah foto lain di aplikasi ini.

## Bagian 4 — Kasus tepi

- **Tanpa konfirmasi untuk "ganti"** — sama seperti tombol ganti Bukti A yang sudah ada, tidak ada
  dialog konfirmasi. Beda dengan hapus, yang tetap pakai `confirm()` + pratinjau besar (`lihatFoto`)
  seperti sekarang, tidak berubah.
- **Tanpa cek `navigator.onLine`** — mengikuti pola `ntHapusFotoServer`/`hapusNota` yang sudah ada
  (langsung panggil server, `gagal()` menampilkan toast error kalau putus sambung).
- **Foto yang sedang diganti sudah terhapus** (jarang) — server melempar "Foto nota tidak ditemukan",
  ditangkap `gagal()`, tidak merusak tampilan.
- **Di luar cakupan (sengaja tidak dikerjakan)**: foto barang yang baru diambil dan belum disimpan
  (`NT.fotoBarang`, lewat `_ntPetakBaru`) belum dapat kotak keterangan — tetap teks baku "Barang
  diterima (HP)". Perluasan itu, kalau diminta nanti, adalah pekerjaan terpisah.

## Bagian 5 — Rencana uji

Verifikasi wajib lewat interaksi nyata (klik/blur sungguhan), bukan cuma panggil fungsi langsung —
mengikuti pelajaran metodologi dari bug kritis `aq()`/`JSON.stringify` (`docs/HANDOFF-MOBILE.md`
bagian 1). `i` pada `ntGantiFotoB(i)`/`ntSimpanKeteranganB(i,...)` adalah indeks integer, pola sama
seperti fungsi yang sudah ada di fungsi yang sama (`ntHapusFotoServer`/`ntHapusFoto`) — **tidak**
perlu `aq()`.

Skenario wajib:
1. Buka "Ubah nota" untuk nota dengan ≥1 foto Bukti B tersimpan → tile tampil dengan tombol "ganti",
   tombol hapus, dan kotak keterangan berisi nilai tersimpan (atau kosong bila belum ada).
2. Klik nyata tombol "ganti" → memicu `click()` pada `#ntGantiBFile` (diverifikasi lewat event
   listener stub — Playwright tak bisa mengisi `input[type=file]` otomatis tanpa file sungguhan).
3. Ubah teks kotak keterangan lalu picu `blur` sungguhan → `serverUpdateFotoNota` terpanggil dengan
   `keterangan` baru, `file:null`.
4. Blur tanpa perubahan teks → `serverUpdateFotoNota` **tidak** terpanggil.
5. Pemindaian `onclick`/`onchange` menyeluruh pada layar Ubah nota (pola tugas 10/11) — pastikan tak
   ada bug kutip.
6. Tombol hapus & pratinjau-sebelum-hapus yang sudah ada tetap jalan seperti sebelumnya (tidak
   regresi).

## Status

Kelima bagian disetujui bertahap oleh pengguna lewat `AskUserQuestion`/persetujuan langsung
(28 Jul 2026). Langkah berikutnya: `writing-plans` untuk rencana implementasi bite-sized.
