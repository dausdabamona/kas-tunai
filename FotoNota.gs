/**
 * FotoNota.gs
 * Modul foto per nota (sheet "Foto Nota") dengan geotagging.
 * Relasi ke nota lewat NO_TRANSAKSI + NOTA_ID.
 * Kolom: NO_TRANSAKSI, NOTA_ID, URUTAN, FILE_ID, NAMA_FILE, URL_FILE,
 *        LAT, LNG, LOKASI, MAPS_URL, WAKTU, KETERANGAN, IS_DELETED, DELETED_AT, DELETED_BY
 * Foto dikirim dari frontend sudah terkompresi; lat/lng dari GPS browser.
 */

var FotoNota = (function () {

  function FC() { return Util.colMap(CONFIG.SHEETS.FOTO_NOTA); }

  /** Map {noTransaksi: jumlahFotoAktif} untuk semua transaksi. */
  function getJmlFotoPerTransaksi() {
    var c = FC();
    var data = SheetRepo.getData(CONFIG.SHEETS.FOTO_NOTA);
    var map = {};
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (isDeleted(r[c.IS_DELETED])) continue;
      var key = String(r[c.NO_TRANSAKSI]);
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }

  function _toObj(c, r, rowIndex) {
    return {
      rowIndex: rowIndex,
      noTransaksi: r[c.NO_TRANSAKSI], notaId: r[c.NOTA_ID], urutan: r[c.URUTAN],
      fileId: r[c.FILE_ID], namaFile: r[c.NAMA_FILE], urlFile: r[c.URL_FILE],
      lat: r[c.LAT], lng: r[c.LNG], lokasi: r[c.LOKASI], mapsUrl: r[c.MAPS_URL],
      waktu: Util.fmtDate(r[c.WAKTU]), keterangan: r[c.KETERANGAN]
    };
  }

  /** Daftar foto untuk satu nota tertentu. */
  function getFotoNota(noTransaksi, notaId) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) && !isDeleted(r[c.IS_DELETED]);
    });
    return rows.map(function (x) { return _toObj(c, x.values, x.rowIndex); });
  }

  /** Nomor URUTAN semua foto satu nota, TERMASUK yang terhapus. */
  function _nomorFotoSemua(noTransaksi, notaId) {
    var c = FC();
    return findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId);
    }).map(function (x) { return x.values[c.URUTAN]; });
  }

  /** Format URL Maps dari lat/lng. */
  function _mapsUrl(lat, lng) {
    if (lat === '' || lng === '' || lat == null || lng == null) return '';
    return 'https://maps.google.com/?q=' + lat + ',' + lng;
  }

  /** Nama file standar: fn_txn{no}_nota{notaId}_{urutan}_{yyyymmdd}_{hhmmss}.jpg */
  function _namaFile(noTransaksi, notaId, urutan, when) {
    var stamp = Utilities.formatDate(when, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    return 'fn_txn' + noTransaksi + '_nota' + notaId + '_' + urutan + '_' + stamp + '.jpg';
  }

  /**
   * Upload daftar foto untuk satu nota.
   * @param fotoArr array of {base64, mimeType, lat, lng, keterangan}
   */
  function uploadFotoNota(noTransaksi, notaId, fotoArr) {
    // Mulai dari nomor terbesar yang pernah dipakai (termasuk foto terhapus),
    // supaya hapus/ubah foto berdasarkan nomor tidak mengenai foto lain.
    var urutan = Util.nomorBerikutnya(_nomorFotoSemua(noTransaksi, notaId)) - 1;
    for (var i = 0; i < fotoArr.length; i++) {
      var foto = fotoArr[i];
      var now = new Date();
      urutan++;
      foto.namaFile = _namaFile(noTransaksi, notaId, urutan, now);
      var up = DriveHelper.upload(foto, {noTransaksi:noTransaksi});
      var lat = (foto.lat == null ? '' : foto.lat);
      var lng = (foto.lng == null ? '' : foto.lng);
      var lokasi = (lat !== '' && lng !== '') ? (lat + ',' + lng) : '';
      SheetRepo.appendRow(CONFIG.SHEETS.FOTO_NOTA, [
        noTransaksi, notaId, urutan, up.fileId, up.namaFile, up.url,
        lat, lng, lokasi, _mapsUrl(lat, lng), now, foto.keterangan || '',
        FLAG_ACTIVE, '', ''
      ]);
    }
    DeferredFlush.mark();
    return { success: true, jml: urutan };
  }

  /** Soft delete satu foto nota berdasarkan urutan. */
  function hapusFotoNota(noTransaksi, notaId, urutan) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) &&
             String(r[c.URUTAN]) === String(urutan) && !isDeleted(r[c.IS_DELETED]);
    });
    if (!rows.length) throw new Error('Foto nota tidak ditemukan');
    var hit = rows[0];
    var fileId = hit.values[c.FILE_ID];
    softDelete(CONFIG.SHEETS.FOTO_NOTA, hit.rowIndex, noTransaksi + '#' + notaId + '#' + urutan);
    if (fileId) DriveHelper.trash(fileId);
    return { success: true };
  }

  /** Ganti gambar dan/atau keterangan satu foto nota yang sudah tersimpan. */
  function updateFotoNota(noTransaksi, notaId, urutan, data) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) &&
             String(r[c.URUTAN]) === String(urutan) && !isDeleted(r[c.IS_DELETED]);
    });
    if (!rows.length) throw new Error('Foto nota tidak ditemukan');
    var hit = rows[0];
    var upd = Util.set(c.KETERANGAN, (data && data.keterangan) || '');
    if (data && data.file && data.file.base64) {
      var oldFileId = hit.values[c.FILE_ID];
      data.file.namaFile = _namaFile(noTransaksi, notaId, urutan, new Date());
      var up = DriveHelper.upload(data.file, {noTransaksi: noTransaksi});
      upd[c.FILE_ID] = up.fileId; upd[c.NAMA_FILE] = up.namaFile; upd[c.URL_FILE] = up.url;
      if (oldFileId) DriveHelper.trash(oldFileId);
    }
    SheetRepo.setCells(CONFIG.SHEETS.FOTO_NOTA, hit.rowIndex, upd);
    DeferredFlush.mark();
    return { success: true };
  }

  /**
   * Pindahkan satu foto ke nota lain DALAM transaksi yang sama.
   *
   * Dipakai untuk merapikan foto yang salah pasang (mis. foto barang yang dulu
   * selalu terkirim ke Nota 1). Baris lama di-soft-delete, baris baru ditulis
   * di nota tujuan dengan FILE_ID yang SAMA: berkas Drive tidak diunggah ulang
   * dan TIDAK dibuang -- beda dengan hapusFotoNota yang membuang berkasnya.
   * Waktu, lokasi, dan keterangan asli ikut dibawa.
   */
  function pindahFotoNota(noTransaksi, notaAsal, urutanFoto, notaTujuan) {
    if (String(notaAsal) === String(notaTujuan)) throw new Error('Nota tujuan sama dengan nota asal.');
    var adaTujuan = false, notas = KasTunai.getMultiNota(noTransaksi);
    for (var i = 0; i < notas.length; i++) if (String(notas[i].urutan) === String(notaTujuan)) adaTujuan = true;
    if (!adaTujuan) throw new Error('Nota tujuan tidak ditemukan di transaksi ' + noTransaksi + '.');

    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaAsal) &&
             String(r[c.URUTAN]) === String(urutanFoto) && !isDeleted(r[c.IS_DELETED]);
    });
    if (!rows.length) throw new Error('Foto tidak ditemukan (mungkin sudah dipindah atau dihapus).');
    var lama = rows[0].values;

    var baru = Util.emptyRow(CONFIG.HEADERS.FOTO_NOTA.length);
    for (var k = 0; k < lama.length && k < baru.length; k++) baru[k] = lama[k];
    var urutanBaru = Util.nomorBerikutnya(_nomorFotoSemua(noTransaksi, notaTujuan));
    baru[c.NOTA_ID] = notaTujuan;
    baru[c.URUTAN] = urutanBaru;
    baru[c.IS_DELETED] = FLAG_ACTIVE; baru[c.DELETED_AT] = ''; baru[c.DELETED_BY] = '';

    // Tulis yang baru dulu, baru tandai yang lama: bila gagal di tengah,
    // akibatnya foto tampil dobel (terlihat & bisa dihapus), bukan hilang.
    SheetRepo.appendRow(CONFIG.SHEETS.FOTO_NOTA, baru);
    softDelete(CONFIG.SHEETS.FOTO_NOTA, rows[0].rowIndex, noTransaksi + '#' + notaAsal + '#' + urutanFoto);
    AuditLog.write('PINDAH_FOTO_NOTA', CONFIG.SHEETS.FOTO_NOTA,
      noTransaksi + '#' + notaAsal + '#' + urutanFoto, '-> nota ' + notaTujuan + ' #' + urutanBaru);
    DeferredFlush.mark();
    return { success: true, notaTujuan: notaTujuan, urutan: urutanBaru };
  }

  /**
   * Ambil semua nota + foto-nya untuk satu transaksi sekaligus.
   * @return {{notas:Array, fotoPerNota:Object}}
   */
  function getNotaDanFoto(noTransaksi) {
    var c = FC();
    var notas = KasTunai.getMultiNota(noTransaksi);
    var fotoData = SheetRepo.getData(CONFIG.SHEETS.FOTO_NOTA);
    var fotoPerNota = {};

    for (var i = 0; i < fotoData.length; i++) {
      var r = fotoData[i];
      if (isDeleted(r[c.IS_DELETED])) continue;
      if (String(r[c.NO_TRANSAKSI]) !== String(noTransaksi)) continue;
      var nid = String(r[c.NOTA_ID]);
      if (!fotoPerNota[nid]) fotoPerNota[nid] = [];
      fotoPerNota[nid].push(_toObj(c, r, i + 2));
    }
    return { notas: notas, fotoPerNota: fotoPerNota };
  }

  /** Data SPJ: nota + foto per nota + peta gambar base64 (untuk cetak). */
  function getSpjData(noTransaksi) {
    var nd = getNotaDanFoto(noTransaksi);
    var imgB64 = {};
    var i, j;
    for (i = 0; i < nd.notas.length; i++) {
      var fid = nd.notas[i].fileId;
      if (fid && !imgB64[fid]) imgB64[fid] = _imgDataUri(fid);
      // foto per item rincian barang (persediaan)
      var det = nd.notas[i].detail || [];
      for (var d = 0; d < det.length; d++) {
        var dfid = det[d].fileId;
        if (dfid && !imgB64[dfid]) imgB64[dfid] = _imgDataUri(dfid);
      }
    }
    for (var nid in nd.fotoPerNota) {
      var arr = nd.fotoPerNota[nid];
      for (j = 0; j < arr.length; j++) {
        var ff = arr[j].fileId;
        if (ff && !imgB64[ff]) imgB64[ff] = _imgDataUri(ff);
      }
    }
    return { notas: nd.notas, fotoPerNota: nd.fotoPerNota, imgB64: imgB64 };
  }

  /** Baca file Drive -> data URI base64; '' bila gagal (frontend fallback). */
  function _imgDataUri(fileId) {
    try {
      var b = DriveApp.getFileById(fileId).getBlob();
      return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (e) {
      Logger.log('[FotoNota] _imgDataUri gagal (' + fileId + '): ' + e.message);
      return '';
    }
  }

  return {
    getJmlFotoPerTransaksi: getJmlFotoPerTransaksi,
    getFotoNota: getFotoNota,
    uploadFotoNota: uploadFotoNota,
    hapusFotoNota: hapusFotoNota,
    updateFotoNota: updateFotoNota,
    pindahFotoNota: pindahFotoNota,
    getNotaDanFoto: getNotaDanFoto,
    getSpjData: getSpjData
  };
})();

/* ============================================================
 * Pemeriksa pasangan nota <-> foto (BACA-SAJA)
 * ============================================================ */

/**
 * Inti analisis, fungsi murni (tanpa Sheets) supaya bisa diuji.
 * @param notaAktif  [{no, urutan}]  nota yang TIDAK terhapus
 * @param fotoAktif  [{no, notaId}]  foto nota yang TIDAK terhapus
 * @return {kembar:[{no,urutan,jumlah}], tumpukNota1:[{no,fotoNota1,notaTanpaFoto}],
 *          yatim:[{no,notaId,jumlah}]}
 *
 * - kembar      : dua nota aktif atau lebih bernomor sama (akibat nomor lama
 *                 "jumlah aktif + 1").
 * - tumpukNota1 : transaksi bernota > 1 yang fotonya ada di Nota 1 sementara
 *                 nota lain kosong -- KANDIDAT akibat desktop dulu selalu
 *                 mengirim foto barang ke Nota 1. Kandidat, bukan kepastian.
 * - yatim       : foto yang nomor notanya tidak cocok dengan nota aktif mana pun.
 */
function analisisPasanganNota_(notaAktif, fotoAktif) {
  var notaPerTx = {}, i, k;
  for (i = 0; i < notaAktif.length; i++) {
    var no = String(notaAktif[i].no), u = String(notaAktif[i].urutan);
    if (!notaPerTx[no]) notaPerTx[no] = {};
    notaPerTx[no][u] = (notaPerTx[no][u] || 0) + 1;
  }
  var fotoPerTx = {};
  for (i = 0; i < fotoAktif.length; i++) {
    var nf = String(fotoAktif[i].no), nid = String(fotoAktif[i].notaId);
    if (!fotoPerTx[nf]) fotoPerTx[nf] = {};
    fotoPerTx[nf][nid] = (fotoPerTx[nf][nid] || 0) + 1;
  }
  var hasil = { kembar: [], tumpukNota1: [], yatim: [] };
  for (var tx in notaPerTx) {
    var peta = notaPerTx[tx], nomor = [];
    for (k in peta) {
      nomor.push(k);
      if (peta[k] > 1) hasil.kembar.push({ no: tx, urutan: k, jumlah: peta[k] });
    }
    var foto = fotoPerTx[tx] || {};
    if (nomor.length > 1 && peta['1'] && foto['1']) {
      var kosong = [];
      for (var j = 0; j < nomor.length; j++) if (nomor[j] !== '1' && !foto[nomor[j]]) kosong.push(nomor[j]);
      if (kosong.length) hasil.tumpukNota1.push({ no: tx, fotoNota1: foto['1'], notaTanpaFoto: kosong });
    }
  }
  for (var tf in fotoPerTx) {
    for (k in fotoPerTx[tf]) {
      if (!notaPerTx[tf] || !notaPerTx[tf][k]) hasil.yatim.push({ no: tf, notaId: k, jumlah: fotoPerTx[tf][k] });
    }
  }
  return hasil;
}

/**
 * Jalankan dari editor Apps Script, baca Log. TIDAK mengubah data apa pun.
 * Hasilnya daftar kerja untuk dirapikan lewat "Pindahkan ke nota..." di desktop.
 */
function cekPasanganNota_() {
  var n = Util.colMap(CONFIG.SHEETS.MULTI_NOTA), c = Util.colMap(CONFIG.SHEETS.FOTO_NOTA);
  var dn = SheetRepo.getData(CONFIG.SHEETS.MULTI_NOTA), df = SheetRepo.getData(CONFIG.SHEETS.FOTO_NOTA);
  var nota = [], foto = [], i;
  for (i = 0; i < dn.length; i++)
    if (dn[i][n.NO_TRANSAKSI] !== '' && !isDeleted(dn[i][n.IS_DELETED]))
      nota.push({ no: dn[i][n.NO_TRANSAKSI], urutan: dn[i][n.URUTAN] });
  for (i = 0; i < df.length; i++)
    if (df[i][c.NO_TRANSAKSI] !== '' && !isDeleted(df[i][c.IS_DELETED]))
      foto.push({ no: df[i][c.NO_TRANSAKSI], notaId: df[i][c.NOTA_ID] });
  var h = analisisPasanganNota_(nota, foto);
  Logger.log('=== Nomor nota KEMBAR (' + h.kembar.length + ') ===');
  h.kembar.forEach(function (x) { Logger.log('Transaksi ' + x.no + ': nota nomor ' + x.urutan + ' ada ' + x.jumlah + ' baris aktif'); });
  Logger.log('=== Foto menumpuk di Nota 1 — periksa (' + h.tumpukNota1.length + ') ===');
  h.tumpukNota1.forEach(function (x) {
    Logger.log('Transaksi ' + x.no + ': ' + x.fotoNota1 + ' foto di Nota 1; nota tanpa foto: ' + x.notaTanpaFoto.join(', '));
  });
  Logger.log('=== Foto YATIM (nota tidak ada) (' + h.yatim.length + ') ===');
  h.yatim.forEach(function (x) { Logger.log('Transaksi ' + x.no + ': ' + x.jumlah + ' foto menempel ke nota ' + x.notaId + ' yang tidak aktif'); });
  return h;
}

/** Uji manual analisisPasanganNota — jalankan dari editor, baca Log. */
function ujiPasanganNota_() {
  var nota = [ {no:1,urutan:1},{no:1,urutan:2},{no:1,urutan:3},   // tx1: tiga nota
               {no:2,urutan:1},{no:2,urutan:3},{no:2,urutan:3},   // tx2: nota 3 kembar
               {no:3,urutan:1},{no:3,urutan:2} ];                 // tx3: rapi
  var foto = [ {no:1,notaId:1},{no:1,notaId:1},{no:1,notaId:1},   // tx1: semua di nota 1
               {no:3,notaId:1},{no:3,notaId:2},                   // tx3: rapi
               {no:4,notaId:1} ];                                 // tx4: tak ada nota
  var h = analisisPasanganNota_(nota, foto), gagal = 0;
  function cek(nama, ok) { if (!ok) gagal++; Logger.log((ok ? 'PASS' : 'FAIL') + ' — ' + nama); }
  cek('kembar terdeteksi di tx2 nota 3', h.kembar.length === 1 && h.kembar[0].no === '2' && h.kembar[0].urutan === '3');
  cek('tx1 masuk daftar tumpuk Nota 1, nota 2 & 3 kosong',
      h.tumpukNota1.length === 1 && h.tumpukNota1[0].no === '1' && h.tumpukNota1[0].notaTanpaFoto.join() === '2,3');
  cek('tx3 yang rapi tidak dilaporkan', JSON.stringify(h).indexOf('"no":"3"') < 0);
  cek('foto tx4 yatim', h.yatim.length === 1 && h.yatim[0].no === '4');
  Logger.log(gagal ? (gagal + ' kasus GAGAL') : 'Semua kasus lulus (4)');
  return gagal === 0;
}
