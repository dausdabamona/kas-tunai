/**
 * Util.gs
 * Helper kecil yang dipakai lintas modul (sebelumnya diduplikasi di
 * KasTunai/Pengembalian). Disatukan agar perubahan format/timezone cukup
 * diedit di satu tempat.
 */

var Util = (function () {

  /** Parse angka aman; non-numeric -> 0. */
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }

  /** Format tanggal -> 'yyyy-MM-dd'; string dibiarkan apa adanya. */
  function fmtDate(v) {
    if (!v) return '';
    if (v instanceof Date) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return String(v);
  }

  /** Array kosong sepanjang len (untuk membentuk baris baru). */
  function emptyRow(len) {
    var a = [];
    for (var i = 0; i < len; i++) a.push('');
    return a;
  }

  /** Bentuk objek updates {colIndex: val} dari pasangan col/val. */
  function set() {
    var o = {};
    for (var i = 0; i + 1 < arguments.length; i += 2) o[arguments[i]] = arguments[i + 1];
    return o;
  }

  /**
   * Peta nama-header -> index kolom (0-based) untuk sebuah sheet.
   * Diturunkan sekali dari CONFIG.HEADERS, lalu di-cache per-eksekusi.
   * Dengan ini tak ada modul yang perlu mengetik index kolom manual.
   * @param {string} sheetName  nama sheet (CONFIG.SHEETS.*)
   */
  function colMap(sheetName) {
    var key = '__colmap__' + sheetName;
    if (_ExecCache.has(key)) return _ExecCache.get(key);

    var headerKey = null;
    for (var k in CONFIG.SHEETS) {
      if (CONFIG.SHEETS[k] === sheetName) { headerKey = k; break; }
    }
    var headers = headerKey ? CONFIG.HEADERS[headerKey] : null;
    var map = {};
    if (headers) for (var i = 0; i < headers.length; i++) map[headers[i]] = i;
    return _ExecCache.set(key, map);
  }

  /**
   * Nomor urut berikutnya = nomor terbesar yang PERNAH dipakai + 1.
   *
   * `daftar` harus memuat nomor SEMUA baris, termasuk yang sudah dihapus
   * (IS_DELETED='Y'). Dulu nomor dihitung dari "jumlah baris aktif + 1":
   * setelah satu nota di tengah dihapus, nota baru memakai ulang nomor nota
   * yang masih hidup, lalu foto, rincian, dan pajaknya tercampur. Nomor yang
   * sudah pernah dipakai tidak boleh keluar lagi.
   * Nilai non-angka / kosong diabaikan. Daftar kosong -> 1.
   * Fungsi murni (tanpa Sheets) supaya bisa diuji lewat ujiNomorNota_().
   */
  function nomorBerikutnya(daftar) {
    var max = 0;
    for (var i = 0; i < (daftar || []).length; i++) {
      var n = parseInt(daftar[i], 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max + 1;
  }

  return { num: num, fmtDate: fmtDate, emptyRow: emptyRow, set: set, colMap: colMap,
           nomorBerikutnya: nomorBerikutnya };
})();

/**
 * Uji manual nomorBerikutnya — jalankan dari editor Apps Script, baca Log.
 * Akhiran _ membuatnya tidak bisa dipanggil dari google.script.run.
 */
function ujiNomorNota_() {
  var kasus = [
    ['daftar kosong',                  [],                 1],
    ['tiga nota berurutan',            [1, 2, 3],          4],
    ['nota 1 dihapus (tetap dihitung)',[1, 2, 3],          4],
    ['hanya nota terakhir tersisa',    [3],                4],
    ['urutan acak',                    [2, 5, 1],          6],
    ['nilai teks dari sheet',          ['1', '2', ' 7 '],  8],
    ['sel kosong diabaikan',           ['', null, 2],      3],
    ['data lama kembar',               [1, 3, 3],          4]
  ];
  var gagal = 0;
  for (var i = 0; i < kasus.length; i++) {
    var hasil = Util.nomorBerikutnya(kasus[i][1]);
    var ok = hasil === kasus[i][2];
    if (!ok) gagal++;
    Logger.log((ok ? 'PASS' : 'FAIL') + ' — ' + kasus[i][0] + ': dapat ' + hasil + ', harap ' + kasus[i][2]);
  }
  Logger.log(gagal ? (gagal + ' kasus GAGAL') : 'Semua kasus lulus (' + kasus.length + ')');
  return gagal === 0;
}
