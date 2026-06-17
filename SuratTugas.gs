/**
 * SuratTugas.gs
 * Data Surat Perjalanan Dinas (SPD) per transaksi kas (sheet "Surat Tugas").
 * Dibuat dari menu Perjalanan Dinas; tertaut ke transaksi pengeluaran via NO_TRANSAKSI.
 */

var SuratTugas = (function () {

  function SC() { return Util.colMap(CONFIG.SHEETS.SURAT_TUGAS); }

  function _nextNo(c) {
    var data = SheetRepo.getData(CONFIG.SHEETS.SURAT_TUGAS);
    var max = 0;
    for (var i = 0; i < data.length; i++) {
      var n = parseInt(data[i][c.NO], 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  /** Simpan surat tugas yang tertaut ke transaksi kas (noTransaksi).
   * Mendukung banyak pegawai: d.pegawaiList = [{nama,nip,pangkat,jabatan,biaya}, ...].
   * Kolom tunggal (PEGAWAI/NIP/...) diisi pegawai pertama untuk kompatibilitas;
   * BIAYA = total; daftar lengkap disimpan di PEGAWAI_JSON. */
  function simpan(noTransaksi, d) {
    var c = SC();
    var list = (d.pegawaiList && d.pegawaiList.length) ? d.pegawaiList
             : [{ nama: d.pegawai || '', nip: d.nip || '', pangkat: d.pangkat || '',
                  jabatan: d.jabatan || '', biaya: Util.num(d.biaya) }];
    var p0 = list[0] || {};
    var total = 0;
    for (var i = 0; i < list.length; i++) total += Util.num(list[i].biaya);
    SheetRepo.appendRow(CONFIG.SHEETS.SURAT_TUGAS, [
      _nextNo(c), noTransaksi, d.nomor || '', p0.nama || '', p0.nip || '',
      p0.pangkat || '', p0.jabatan || '', d.maksud || '', d.angkutan || '',
      d.berangkat || '', d.tujuan || '',
      d.tglMulai ? new Date(d.tglMulai) : '', d.tglSelesai ? new Date(d.tglSelesai) : '',
      Util.num(d.jumlahHari), total, d.akun || '',
      d.ppk || '', d.nipPpk || '',
      d.lokNama || '', d.lokJab || '', d.kerjaNama || '', d.kerjaJab || '',
      new Date(), getOperator(), JSON.stringify(list)
    ]);
    DeferredFlush.mark();
    return { success: true };
  }

  function _row2obj(c, r) {
    var list = [];
    var raw = r[c.PEGAWAI_JSON];
    if (raw) { try { list = JSON.parse(raw) || []; } catch (e) { list = []; } }
    if (!list.length) {
      list = [{ nama: r[c.PEGAWAI], nip: r[c.NIP], pangkat: r[c.PANGKAT],
                jabatan: r[c.JABATAN], biaya: Util.num(r[c.BIAYA]) }];
    }
    return {
      noTransaksi: r[c.NO_TRANSAKSI], nomor: r[c.NOMOR_SURAT], pegawai: r[c.PEGAWAI],
      nip: r[c.NIP], pangkat: r[c.PANGKAT], jabatan: r[c.JABATAN], maksud: r[c.MAKSUD],
      angkutan: r[c.ANGKUTAN], berangkat: r[c.BERANGKAT], tujuan: r[c.TUJUAN],
      tglMulai: Util.fmtDate(r[c.TGL_MULAI]), tglSelesai: Util.fmtDate(r[c.TGL_SELESAI]),
      jumlahHari: Util.num(r[c.JUMLAH_HARI]), biaya: Util.num(r[c.BIAYA]), akun: r[c.AKUN],
      ppk: r[c.PPK], nipPpk: r[c.NIP_PPK],
      lokNama: r[c.LOK_NAMA], lokJab: r[c.LOK_JAB], kerjaNama: r[c.KERJA_NAMA], kerjaJab: r[c.KERJA_JAB],
      pegawaiList: list
    };
  }

  /** Surat tugas terbaru untuk satu transaksi (untuk cetak ulang). */
  function get(noTransaksi) {
    var c = SC();
    var data = SheetRepo.getData(CONFIG.SHEETS.SURAT_TUGAS);
    for (var i = data.length - 1; i >= 0; i--) {
      if (String(data[i][c.NO_TRANSAKSI]) === String(noTransaksi)) return _row2obj(c, data[i]);
    }
    return null;
  }

  /** Peta {noTransaksi: nomorSurat} — penanda kartu perjalanan dinas. */
  function getMap() {
    var c = SC();
    var data = SheetRepo.getData(CONFIG.SHEETS.SURAT_TUGAS);
    var map = {};
    for (var i = 0; i < data.length; i++) {
      var key = String(data[i][c.NO_TRANSAKSI]);
      if (key) map[key] = data[i][c.NOMOR_SURAT] || true;
    }
    return map;
  }

  return { simpan: simpan, get: get, getMap: getMap };
})();
