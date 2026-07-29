/**
 * AntreanStatus.gs
 * Status antrean unggah offline mobile, dilaporkan tiap kali HP online.
 *
 * Disimpan di AppCache (BUKAN sheet) -- data ini murni sementara dan wajar basi
 * setelah beberapa jam tanpa laporan baru dari HP yang bersangkutan. Menyimpannya
 * ke sheet hanya menambah tulisan tanpa nilai historis.
 */
var AntreanStatus = (function () {
  var TTL = 3600; // 1 jam -- laporan lebih tua dianggap basi, bukan nol

  function _key(email) { return 'antrean_' + String(email || '').toLowerCase(); }

  function lapor(email, jumlahDraft, jumlahGagal) {
    AppCache.put(_key(email), {
      email: email,
      jumlahDraft: Util.num(jumlahDraft),
      jumlahGagal: Util.num(jumlahGagal),
      waktu: new Date().toISOString()
    }, TTL);
    return { success: true };
  }

  /**
   * Mengiterasi Users.list() lalu mengecek cache satu per satu KARENA CacheService
   * GAS tidak punya operasi "ambil semua key berawalan X". Ini satu-satunya cara
   * yang tersedia di platform, bukan solusi sementara. Entri kedaluwarsa otomatis
   * tidak muncul (AppCache.get mengembalikan null), tanpa pembersihan manual.
   */
  function getSemua() {
    var users = Users.list(), out = [], i, v;
    for (i = 0; i < users.length; i++) {
      v = AppCache.get(_key(users[i].email));
      if (v) out.push(v);
    }
    return out;
  }

  return { lapor: lapor, getSemua: getSemua };
})();
