/**
 * Code.gs
 * Entry point web app (doGet) + semua fungsi server* yang dipanggil
 * frontend via google.script.run. Tiap wrapper tipis: validasi -> delegasi
 * ke modul business logic -> commitAndInvalidate -> return.
 */

/* ============================================================
 * Entry point
 * ============================================================ */
function doGet() {
  var tpl = HtmlService.createTemplateFromFile('index');
  tpl.appData = {
    user:      _safeEmail(),
    namaUser:  '',
    roleUser:  'operator',
    isAdmin:   false,
    saldoAwal: CONFIG.SALDO_AWAL
  };
  return tpl.evaluate()
    .setTitle('Kas Tunai - Poltek KP Sorong')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Include partial HTML/CSS/JS (dipakai bila file dipecah). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function _safeEmail() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/** Bungkus pemanggilan modul + flush sekali di akhir. */
function _run(fn) {
  try {
    var result = fn();
    DeferredFlush.commitAndInvalidate();
    return result;
  } catch (e) {
    Logger.log('[Code] Error: ' + e.message + '\n' + (e.stack || ''));
    DeferredFlush.commitAndInvalidate();
    throw e;
  }
}

/* ============================================================
 * Transaksi
 * ============================================================ */
function serverGetTransaksi() {
  return _run(function () { return KasTunai.getTransaksi(); });
}

/** Muat data dashboard awal dalam satu round-trip: transaksi + jumlah foto + surat tugas. */
function serverGetDashboard() {
  return _run(function () {
    return {
      transaksi: KasTunai.getTransaksi(),
      fotoMap: FotoNota.getJmlFotoPerTransaksi(),
      suratMap: SuratTugas.getMap()
    };
  });
}

/* ============================================================
 * Perjalanan Dinas / Surat Tugas
 * ============================================================ */
function serverSimpanPerjalananDinas(data) {
  return _run(function () {
    var res = KasTunai.tambahTransaksi({
      tanggal: data.tglMulai,
      debet: 0, kredit: Util.num(data.biaya),
      penjab: data.pegawai || '',
      kegiatan: data.maksud || ('Perjalanan Dinas ' + (data.nomor || '')),
      keterangan: 'Surat Tugas ' + (data.nomor || '') + ' (' + Util.num(data.jumlahHari) + ' hari)'
    });
    SuratTugas.simpan(res.no, data);
    return { success: true, no: res.no };
  });
}
function serverGetSuratTugas(noTransaksi) {
  return _run(function () { return SuratTugas.get(noTransaksi); });
}
function serverTambahTransaksi(data) {
  return _run(function () { return KasTunai.tambahTransaksi(data); });
}

/* ============================================================
 * Multi Nota
 * ============================================================ */
function serverGetMultiNota(transactionId) {
  return _run(function () { return KasTunai.getMultiNota(transactionId); });
}
function serverTambahNota(transactionId, notaData) {
  return _run(function () { return KasTunai.tambahNota(transactionId, notaData); });
}
function serverHapusNotaItem(transactionId, urutan, fileId) {
  return _run(function () { return KasTunai.hapusNotaItem(transactionId, urutan, fileId); });
}
function serverRestoreNota(transactionId, urutan) {
  return _run(function () { return KasTunai.restoreNota(transactionId, urutan); });
}

/* ============================================================
 * Foto Nota
 * ============================================================ */
function serverGetJmlFotoPerTransaksi() {
  return _run(function () { return FotoNota.getJmlFotoPerTransaksi(); });
}
function serverGetFotoNota(noTransaksi, notaId) {
  return _run(function () { return FotoNota.getFotoNota(noTransaksi, notaId); });
}
function serverUploadFotoNota(noTransaksi, notaId, fotoArr) {
  return _run(function () { return FotoNota.uploadFotoNota(noTransaksi, notaId, fotoArr); });
}
function serverHapusFotoNota(noTransaksi, notaId, urutan) {
  return _run(function () { return FotoNota.hapusFotoNota(noTransaksi, notaId, urutan); });
}
function serverGetNotaDanFoto(noTransaksi) {
  return _run(function () { return FotoNota.getNotaDanFoto(noTransaksi); });
}
function serverGetSpjData(noTransaksi) {
  return _run(function () { return FotoNota.getSpjData(noTransaksi); });
}

/* ============================================================
 * Foto Barang
 * ============================================================ */
function serverUploadFotoBarang(transactionId, fotoArr) {
  return _run(function () { return KasTunai.tambahFotoBarang(transactionId, fotoArr); });
}

/* ============================================================
 * Pengembalian
 * ============================================================ */
function serverGetPengembalian(transactionId) {
  return _run(function () { return Pengembalian.getPengembalian(transactionId); });
}
function serverTambahPengembalian(transactionId, data) {
  return _run(function () { return Pengembalian.tambahPengembalian(transactionId, data); });
}
function serverHapusPengembalian(transactionId, urutan) {
  return _run(function () { return Pengembalian.hapusPengembalian(transactionId, urutan); });
}
function serverRestorePengembalian(transactionId, urutan) {
  return _run(function () { return Pengembalian.restorePengembalian(transactionId, urutan); });
}

/* ============================================================
 * Master Penyedia
 * ============================================================ */
function serverGetAllPenyedia() {
  return _run(function () { return MasterPenyedia.getAll(); });
}
function serverSimpanPenyedia(data) {
  return _run(function () { return MasterPenyedia.simpan(data); });
}
function serverCariPenyedia(keyword) {
  return _run(function () { return MasterPenyedia.cari(keyword); });
}

/* ============================================================
 * SPBY
 * ============================================================ */
function serverSimpanSpby(rowIndex, noSpby, tglSpby) {
  return _run(function () { return KasTunai.simpanSpby(rowIndex, noSpby, tglSpby); });
}
function serverHapusSpby(rowIndex) {
  return _run(function () { return KasTunai.hapusSpby(rowIndex); });
}

/* ============================================================
 * Kuitansi ber-TTD (upload scan/foto)
 * ============================================================ */
function serverUploadKuitansi(transactionId, file) {
  return _run(function () { return KasTunai.uploadKuitansi(transactionId, file); });
}
function serverHapusKuitansi(transactionId) {
  return _run(function () { return KasTunai.hapusKuitansi(transactionId); });
}

/* ============================================================
 * Rekap
 * ============================================================ */
function serverGetRekap() {
  return _run(function () { return KasTunai.getRekap(); });
}
