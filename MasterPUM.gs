/**
 * MasterPUM.gs
 * Nomor WhatsApp pemegang uang muka, untuk tombol Tagih (papan pemantau
 * uang muka belum dipertanggungjawabkan). Pola identik MasterPenyedia.gs.
 * Kolom: NAMA_PUM, NO_HP, TERAKHIR_DIPAKAI (tanpa soft-delete).
 */

var MasterPUM = (function () {

  function PC() { return Util.colMap(CONFIG.SHEETS.MASTER_PUM); }

  /** Cari nomor HP tersimpan untuk satu nama PUM, atau '' bila belum ada. */
  function getNoHp(nama) {
    var c = PC();
    var rows = findRows(CONFIG.SHEETS.MASTER_PUM, function (r) {
      return String(r[c.NAMA_PUM]).toLowerCase() === String(nama || '').toLowerCase();
    });
    return rows.length ? String(rows[0].values[c.NO_HP] || '') : '';
  }

  /** Peta nama(lowercase) -> noHp, sekali baca untuk seluruh daftar PUM. */
  function getSemuaPeta() {
    var c = PC();
    var data = SheetRepo.getData(CONFIG.SHEETS.MASTER_PUM);
    var peta = {};
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (!r[c.NAMA_PUM]) continue;
      peta[String(r[c.NAMA_PUM]).toLowerCase()] = String(r[c.NO_HP] || '');
    }
    return peta;
  }

  /** Simpan / update nomor HP (key = nama, case-insensitive). */
  function simpan(nama, noHp) {
    if (!nama) throw new Error('Nama PUM wajib diisi');
    var c = PC();
    SheetRepo.ensureMinCols(CONFIG.SHEETS.MASTER_PUM, CONFIG.HEADERS.MASTER_PUM.length);
    var rows = findRows(CONFIG.SHEETS.MASTER_PUM, function (r) {
      return String(r[c.NAMA_PUM]).toLowerCase() === String(nama).toLowerCase();
    });
    if (rows.length) {
      SheetRepo.setCells(CONFIG.SHEETS.MASTER_PUM, rows[0].rowIndex, Util.set(
        c.NO_HP, noHp || '', c.TERAKHIR_DIPAKAI, new Date()));
      DeferredFlush.mark();
      return { success: true, updated: true };
    }
    SheetRepo.appendRow(CONFIG.SHEETS.MASTER_PUM, [nama, noHp || '', new Date()]);
    DeferredFlush.mark();
    return { success: true, updated: false };
  }

  return { getNoHp: getNoHp, getSemuaPeta: getSemuaPeta, simpan: simpan };
})();
