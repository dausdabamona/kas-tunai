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
    // Perbaiki label header kolom yang kosong (sekali per TTL cache; idempotent).
    if (!AppCache.get('hdr_fixed_v1')) {
      try { SheetRepo.ensureHeaders(); } catch (e) { Logger.log('[ensureHeaders] ' + e.message); }
      AppCache.put('hdr_fixed_v1', 1);
    }
    return {
      transaksi: KasTunai.getTransaksi(),
      fotoMap: FotoNota.getJmlFotoPerTransaksi(),
      suratMap: SuratTugas.getMap(),
      saldo: KasTunai.ringkasanSaldo()
    };
  });
}

/** Perbaiki header kolom kosong secara manual (dari frontend bila perlu). */
function serverPerbaikiHeader() {
  return _run(function () { return SheetRepo.ensureHeaders(); });
}

/** Jalankan langsung dari editor Apps Script untuk mengisi header kosong sekarang juga. */
function perbaikiHeader() {
  return SheetRepo.ensureHeaders();
}

/** Pindah dana antar kas (Bank <-> Tunai). arah: 'BANK_TUNAI' | 'TUNAI_BANK'. */
function serverPindahDana(arah, nominal, tanggal, keterangan) {
  return _run(function () { return KasTunai.pindahDana(arah, nominal, tanggal, keterangan); });
}

/* ============================================================
 * Perjalanan Dinas / Surat Tugas
 * ============================================================ */
/** Ringkas data SPD → field transaksi kas (total, penjab, kegiatan, keterangan, porsiBank).
 * porsiBank = Σ item "dibayar bendahara" (transport ditandai + penginapan ditandai) → dibebankan Kas Bank. */
function _pdMeta(data) {
  var list = (data.pegawaiList && data.pegawaiList.length) ? data.pegawaiList
           : [{ nama: data.pegawai || '', biaya: Util.num(data.biaya) }];
  var total = 0, nama = [], porsiBank = 0;
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    total += Util.num(p.biaya);
    if (p.nama) nama.push(p.nama);
    var tr = p.transport || [];
    for (var j = 0; j < tr.length; j++) if (tr[j] && tr[j].bendahara) porsiBank += Util.num(tr[j].jumlah);
    if (p.penginapanBendahara) porsiBank += Util.num(p.penginapan);
  }
  if (porsiBank > total) porsiBank = total;
  var jenisLbl = (data.jenis === 'LUAR_KOTA') ? 'Luar Kota' : 'Dalam Kota';
  return {
    tanggal: data.tglMulai, debet: 0, kredit: total, porsiBank: porsiBank,
    penjab: nama.join(', '),
    kegiatan: data.maksud || ('Perjalanan Dinas ' + (data.nomor || '')),
    keterangan: 'Surat Tugas ' + (data.nomor || '') + ' (' + jenisLbl + ', ' +
                Util.num(data.jumlahHari) + ' hari, ' + list.length + ' pegawai)'
  };
}
/** Data baris BANK (porsi tiket/hotel dibayar bendahara) tertaut ke PD primary No. */
function _pdBankRow(meta, no) {
  return { tanggal: meta.tanggal, debet: 0, kredit: meta.porsiBank, sumber: 'BANK',
    penjab: meta.penjab, kegiatan: 'Tiket/Hotel dibayar Bendahara — ' + meta.kegiatan,
    keterangan: 'Dibayar bendahara via Kas Bank, ref PD No ' + no };
}
function serverSimpanPerjalananDinas(data) {
  return _run(function () {
    var meta = _pdMeta(data);
    var res = KasTunai.tambahTransaksi({
      tanggal: meta.tanggal, debet: 0, kredit: meta.kredit - meta.porsiBank, sumber: 'TUNAI',
      penjab: meta.penjab, kegiatan: meta.kegiatan, keterangan: meta.keterangan });
    var no = res.no;
    if (meta.porsiBank > 0) {
      var bd = _pdBankRow(meta, no); bd.refTransfer = 'PD-' + no;
      KasTunai.tambahTransaksi(bd);
    }
    SuratTugas.simpan(no, data);
    return { success: true, no: no };
  });
}
function serverUpdatePerjalananDinas(no, data) {
  return _run(function () {
    var meta = _pdMeta(data);
    KasTunai.updateTransaksi(no, {
      tanggal: meta.tanggal, debet: 0, kredit: meta.kredit - meta.porsiBank, sumber: 'TUNAI',
      penjab: meta.penjab, kegiatan: meta.kegiatan, keterangan: meta.keterangan });
    var bankNo = KasTunai.findByRef('PD-' + no, 'BANK');
    if (meta.porsiBank > 0) {
      if (bankNo) KasTunai.updateTransaksi(bankNo, _pdBankRow(meta, no));
      else { var bd = _pdBankRow(meta, no); bd.refTransfer = 'PD-' + no; KasTunai.tambahTransaksi(bd); }
    } else if (bankNo) {
      KasTunai.hapusTransaksi(bankNo);
    }
    SuratTugas.update(no, data);
    return { success: true, no: no };
  });
}
function serverGetSuratTugas(noTransaksi) {
  return _run(function () { return SuratTugas.get(noTransaksi); });
}
function serverTambahTransaksi(data) {
  return _run(function () { return KasTunai.tambahTransaksi(data); });
}
function serverUpdateTransaksi(no, data) {
  return _run(function () { return KasTunai.updateTransaksi(no, data); });
}

/* ============================================================
 * Impor Rekening Koran (Bank) — .xlsx via Advanced Drive Service
 * ============================================================ */
/** Konversi .xlsx (base64) ke Google Sheet sementara, baca semua sel, lalu hapus.
 *  Kembalikan array 2D (tanggal di-format string) untuk pratinjau & pemetaan di frontend. */
function serverParseRekKoran(base64, filename) {
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), MimeType.MICROSOFT_EXCEL, filename || 'rk.xlsx');
  var tmp = Drive.Files.insert({ title: 'tmp_rk_' + Date.now(), mimeType: MimeType.GOOGLE_SHEETS }, blob, { convert: true });
  var tz = Session.getScriptTimeZone();
  try {
    var sheet = SpreadsheetApp.openById(tmp.id).getSheets()[0];
    var values = sheet.getDataRange().getValues();
    return values.map(function (row) {
      return row.map(function (c) {
        return (c instanceof Date) ? Utilities.formatDate(c, tz, 'yyyy-MM-dd') : c;
      });
    });
  } finally {
    try { Drive.Files.remove(tmp.id); } catch (e) {}
  }
}

/** Simpan mutasi rekening koran sbg transaksi BANK (dedup via REF 'RK-...').
 *  list: [{tanggal, uraian, debet, kredit}] — perspektif REKENING:
 *  debet rekening = uang KELUAR (kredit app), kredit rekening = uang MASUK (debet app). */
function serverImporBank(list) {
  return _run(function () {
    var hasil = { ditambah: 0, dilewati: 0 };
    list = list || [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var masuk = Util.num(it.kredit);   // kredit rekening → masuk
      var keluar = Util.num(it.debet);   // debet rekening → keluar
      if (masuk <= 0 && keluar <= 0) continue;
      // Dedup: No Journal BNI dipakai bersama oleh transaksi induk + baris biayanya,
      // jadi gabungkan ID + nominal agar baris biaya (ATM/Prima) tidak ikut terbuang.
      var ref = 'RK-' + (it.id ? (String(it.id) + '-' + (masuk - keluar))
                                : _rkRef(it.tanggal, masuk - keluar, it.uraian));
      if (KasTunai.findByRef(ref)) { hasil.dilewati++; continue; }
      KasTunai.tambahTransaksi({
        tanggal: it.tanggal, debet: masuk, kredit: keluar, sumber: 'BANK', refTransfer: ref,
        kegiatan: (it.uraian || 'Mutasi bank'), penjab: 'Bank',
        keterangan: 'Impor rekening koran' });
      hasil.ditambah++;
    }
    return hasil;
  });
}
/* ============================================================
 * Bukti Perjalanan Dinas (tiket/boarding) + SPJ bundel
 * ============================================================ */
function serverGetBuktiPD(no, withB64) {
  return _run(function () { return BuktiPD.getBukti(no, withB64); });
}
function serverUploadBuktiPD(no, fileArr) {
  return _run(function () { return BuktiPD.uploadBukti(no, fileArr); });
}
function serverHapusBuktiPD(no, urutan) {
  return _run(function () { return BuktiPD.hapusBukti(no, urutan); });
}
function serverZipBuktiPD(no, namaZip) {
  return _run(function () { return BuktiPD.zipBukti(no, namaZip); });
}

/** Penanda unik baris rekening koran untuk anti-duplikat. */
function _rkRef(tanggal, nominal, uraian) {
  var key = String(tanggal || '') + '|' + nominal + '|' + String(uraian || '').replace(/\s+/g, ' ').trim();
  var h = 0;
  for (var i = 0; i < key.length; i++) { h = (h * 31 + key.charCodeAt(i)) & 0x7fffffff; }
  return h.toString(36);
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
