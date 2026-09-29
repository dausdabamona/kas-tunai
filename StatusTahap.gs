/**
 * StatusTahap.gs
 * Status 7 tahap pertanggungjawaban satu transaksi pengeluaran — SATU sumber
 * kebenaran untuk desktop, HP, dan Papan kerja (docs/HANDOFF-DESKTOP.md bagian 0j).
 *
 * Urutan tahap (dikonfirmasi pengguna 29 Sep 2026: SPBy ditandatangani PPK
 * SETELAH nota terkumpul):
 *   1 catat · 2 serahkan uang · 3 nota & bukti · 4 pajak · 5 pengembalian sisa
 *   · 6 SPBy · 7 SPJ & GUP
 *
 * Sisa di tangan PUM memakai rumus HANDOFF-MOBILE bagian 2:
 *   UM = uangDiserahkan > 0 ? uangDiserahkan : kredit
 *   sisa = UM − ΣNota − ΣKembaliSisa     (NOTA_TOTAL & KEMBALIAN_TOTAL; yang
 *   terakhir sudah hanya menghitung pengembalian berjenis SISA)
 * Jangan menulis varian rumus ini di tempat lain — panggil modul ini.
 *
 * Pajak dinilai PER NOTA (keputusan K-UX1), bukan per transaksi.
 */
var StatusTahap = (function () {

  var LABEL = {
    catat: 'Catat', serahkan: 'Serahkan uang', nota: 'Nota & bukti', pajak: 'Pajak',
    kembali: 'Pengembalian sisa', spby: 'SPBy', gup: 'SPJ & GUP'
  };
  var URUT = ['catat', 'serahkan', 'nota', 'pajak', 'kembali', 'spby', 'gup'];

  function _rp(n) {
    var s = String(Math.round(Math.abs(n))), out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return 'Rp' + s + out;
  }

  /**
   * Fungsi murni (tanpa Sheets) — diuji lewat ujiStatusTahap_().
   * @param t      {kredit, uangDiserahkan, notaTotal, kembalianTotal, kuitansiUrl,
   *                noSpby, noDrpp, noSpp, kodeItem, sumber}
   * @param notas  [{nama, adaScan:Boolean, pajakSet:Boolean}] nota AKTIF transaksi itu
   * @return {selesai, dari, tahap:{kode:Boolean}, berikut:kode|null,
   *          labelBerikut, kurang:[String], peringatan:[String]}
   */
  function hitung(t, notas) {
    notas = notas || [];
    var n = Util.num, i;
    var kredit = n(t.kredit);
    var um = n(t.uangDiserahkan) > 0 ? n(t.uangDiserahkan) : kredit;
    var sisa = um - n(t.notaTotal) - n(t.kembalianTotal);
    var ok = {}, kurang = [], peringatan = [];

    ok.catat = true;
    if (!String(t.kodeItem || '').trim()) peringatan.push('item POK belum dipilih (MAK cetakan tidak lengkap)');

    ok.serahkan = !!String(t.kuitansiUrl || '').trim();
    if (!ok.serahkan) kurang.push((String(t.sumber).toUpperCase() === 'BANK' ? 'Bukti Transfer' : 'Tanda Terima')
                                  + ' ber-TTD belum diunggah');

    var tanpaScan = [], tanpaPajak = [];
    for (i = 0; i < notas.length; i++) {
      var nm = notas[i].nama || ('Nota ' + (i + 1));
      if (!notas[i].adaScan) tanpaScan.push(nm);
      if (!notas[i].pajakSet) tanpaPajak.push(nm);
    }
    ok.nota = notas.length > 0 && tanpaScan.length === 0;
    if (!notas.length) kurang.push('belum ada nota');
    else if (tanpaScan.length) kurang.push('scan nota ' + tanpaScan.join(', ') + ' belum ada');

    ok.pajak = notas.length > 0 && tanpaPajak.length === 0;
    if (notas.length && tanpaPajak.length) kurang.push('pajak ' + tanpaPajak.join(', ') + ' belum ditetapkan');

    ok.kembali = sisa <= 0;
    if (sisa > 0) kurang.push('sisa ' + _rp(sisa) + ' belum bernota/dikembalikan');
    if (sisa < 0) peringatan.push('nota melebihi uang muka ' + _rp(-sisa));

    ok.spby = !!String(t.noSpby || '').trim();
    if (!ok.spby) kurang.push('SPBy belum dicatat');

    ok.gup = !!(String(t.noDrpp || '').trim() || String(t.noSpp || '').trim());
    if (!ok.gup) kurang.push('belum masuk DRPP/SPP');

    var selesai = 0, berikut = null;
    for (i = 0; i < URUT.length; i++) {
      if (ok[URUT[i]]) selesai++;
      else if (berikut === null) berikut = URUT[i];
    }
    return { selesai: selesai, dari: URUT.length, tahap: ok, berikut: berikut,
             labelBerikut: berikut ? LABEL[berikut] : '', kurang: kurang, peringatan: peringatan };
  }

  /** Peta noTransaksi -> [{nama, adaScan, pajakSet}] dari sheet Multi Nota (sekali baca). */
  function _petaNota() {
    var c = Util.colMap(CONFIG.SHEETS.MULTI_NOTA);
    var data = SheetRepo.getData(CONFIG.SHEETS.MULTI_NOTA), peta = {};
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (isDeleted(r[c.IS_DELETED])) continue;
      var no = String(r[c.NO_TRANSAKSI]);
      var kat = r[c.PAJAK_KATEGORI_IDX];
      (peta[no] = peta[no] || []).push({
        nama: String(r[c.NAMA_NOTA] || ''),
        adaScan: !!String(r[c.FILE_ID] || '').trim(),
        pajakSet: !(kat === '' || kat === null || kat === undefined)
      });
    }
    return peta;
  }

  /**
   * Tempelkan `tahap` ke setiap transaksi pengeluaran di daftar (dipanggil dari
   * KasTunai.getTransaksi). Transaksi masuk dan pindah dana (TF-) tidak punya
   * siklus pertanggungjawaban -> tidak diberi `tahap`.
   */
  function tempelkan(txList) {
    var peta = _petaNota();
    for (var i = 0; i < txList.length; i++) {
      var t = txList[i];
      if (Util.num(t.kredit) <= 0) continue;
      if (t.transfer || String(t.refTransfer || '').indexOf('TF-') === 0) continue;
      t.tahap = hitung(t, peta[String(t.no)] || []);
    }
    return txList;
  }

  return { hitung: hitung, tempelkan: tempelkan, URUT: URUT, LABEL: LABEL };
})();

/** Uji manual StatusTahap.hitung — jalankan dari editor Apps Script, baca Log. */
function ujiStatusTahap_() {
  var H = StatusTahap.hitung, gagal = 0;
  function cek(nama, ok) { if (!ok) gagal++; Logger.log((ok ? 'PASS' : 'FAIL') + ' — ' + nama); }
  var baru = H({ kredit: 300000, sumber: 'TUNAI' }, []);
  cek('transaksi baru: 1 dari 7, berikutnya Serahkan uang', baru.selesai === 1 && baru.berikut === 'serahkan');
  cek('tanpa item POK -> peringatan, bukan tahap gagal', baru.tahap.catat && baru.peringatan.length === 1);
  var bank = H({ kredit: 1, sumber: 'BANK' }, []);
  cek('sumber BANK menyebut Bukti Transfer', bank.kurang[0].indexOf('Bukti Transfer') === 0);
  var nota = H({ kredit: 300000, kuitansiUrl: 'x', notaTotal: 300000, kodeItem: '000101' },
               [{ nama: 'Toko A', adaScan: true, pajakSet: true }, { nama: 'Toko B', adaScan: false, pajakSet: false }]);
  cek('nota Toko B tanpa scan & pajak -> berhenti di tahap Nota', nota.berikut === 'nota' && nota.selesai === 3);
  cek('kurang menyebut nama toko', nota.kurang.join('|').indexOf('scan nota Toko B') >= 0 && nota.kurang.join('|').indexOf('pajak Toko B') >= 0);
  var sisa = H({ kredit: 500000, uangDiserahkan: 500000, kuitansiUrl: 'x', notaTotal: 300000, kembalianTotal: 50000 },
               [{ nama: 'A', adaScan: true, pajakSet: true }]);
  cek('sisa = UM − ΣNota − ΣKembaliSisa = Rp150.000', sisa.kurang.join('|').indexOf('sisa Rp150.000') >= 0 && sisa.berikut === 'kembali');
  var lengkap = H({ kredit: 300000, kuitansiUrl: 'x', notaTotal: 300000, noSpby: '12', noDrpp: 'D1', kodeItem: '1' },
                  [{ nama: 'A', adaScan: true, pajakSet: true }]);
  cek('semua lengkap -> 7 dari 7, tanpa tahap berikut', lengkap.selesai === 7 && lengkap.berikut === null && lengkap.kurang.length === 0);
  var lebih = H({ kredit: 100000, kuitansiUrl: 'x', notaTotal: 120000 }, [{ nama: 'A', adaScan: true, pajakSet: true }]);
  cek('nota melebihi UM -> tahap kembali selesai + peringatan', lebih.tahap.kembali && lebih.peringatan.join().indexOf('melebihi') >= 0);
  var spbyDulu = H({ kredit: 100000, noSpby: '9' }, []);
  cek('SPBy tercatat tapi nota belum -> berikut tetap tahap paling awal yang kurang', spbyDulu.berikut === 'serahkan' && spbyDulu.tahap.spby);
  Logger.log(gagal ? (gagal + ' kasus GAGAL') : 'Semua kasus lulus (9)');
  return gagal === 0;
}
