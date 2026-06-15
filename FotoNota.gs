/**
 * FotoNota.gs
 * Modul foto per nota (sheet "Foto Nota").
 * Relasi ke nota lewat NO_TRANSAKSI + NOTA_ID.
 * Foto dikirim dari frontend sudah terkompresi + watermark GPS.
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

  /** Daftar foto untuk satu nota tertentu. */
  function getFotoNota(noTransaksi, notaId) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) && !isDeleted(r[c.IS_DELETED]);
    });
    return rows.map(function (x) {
      var r = x.values;
      return {
        rowIndex: x.rowIndex,
        noTransaksi: r[c.NO_TRANSAKSI], notaId: r[c.NOTA_ID], urutan: r[c.URUTAN],
        fileId: r[c.FILE_ID], namaFile: r[c.NAMA_FILE], urlFile: r[c.URL_FILE],
        lat: r[c.LAT], lng: r[c.LNG]
      };
    });
  }

  /** Upload daftar foto untuk satu nota. */
  function uploadFotoNota(noTransaksi, notaId, fotoArr) {
    var urutan = getFotoNota(noTransaksi, notaId).length;
    for (var i = 0; i < fotoArr.length; i++) {
      var foto = fotoArr[i];
      var up = DriveHelper.upload(foto);
      urutan++;
      SheetRepo.appendRow(CONFIG.SHEETS.FOTO_NOTA, [
        noTransaksi, notaId, urutan, up.fileId, up.namaFile, up.url,
        foto.lat || '', foto.lng || '', new Date(), FLAG_ACTIVE, '', ''
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
      fotoPerNota[nid].push({
        urutan: r[c.URUTAN], fileId: r[c.FILE_ID], namaFile: r[c.NAMA_FILE],
        urlFile: r[c.URL_FILE], lat: r[c.LAT], lng: r[c.LNG]
      });
    }
    return { notas: notas, fotoPerNota: fotoPerNota };
  }

  return {
    getJmlFotoPerTransaksi: getJmlFotoPerTransaksi,
    getFotoNota: getFotoNota,
    uploadFotoNota: uploadFotoNota,
    hapusFotoNota: hapusFotoNota,
    getNotaDanFoto: getNotaDanFoto
  };
})();
