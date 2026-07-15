/**
 * Rekonsiliasi.gs — Fase 2 rekonsiliasi SAKTI.
 * (1) UPSERT ekspor SAKTI (idempoten) ke sheet acuan SAKTI_SPBy.
 * (2) Mesin cocok Tier 0: 1:1 lewat No Kuitansi (deterministik, nilai sama persis).
 * Menulis Status Rekon ke tiap transaksi + mengembalikan ringkasan.
 * Tidak menyentuh model saldo/kolom lama. Berhenti di Tier 0 (tanpa fuzzy).
 */
var Rekonsiliasi = (function () {

  var C = CONFIG.COLS;                                   // kolom Kas Tunai
  function SC() { return Util.colMap(CONFIG.SHEETS.SAKTI_SPBY); }

  function _norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  /** Baris pajak SAKTI: Akun diawali '411' (mis. 411xxx). */
  function _isPajak(akun) { return String(akun || '').replace(/\s+/g, '').indexOf('411') === 0; }
  /** Kunci dedup baris SAKTI = No PB | No Kuitansi | Nilai (dibulatkan ke rupiah). */
  function _dedupKey(noPb, noKuitansi, nilai) {
    return _norm(noPb) + '|' + _norm(noKuitansi) + '|' + Math.round(Util.num(nilai));
  }
  function _batchId() {
    return 'B' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  }

  /* ---------------- UPSERT SAKTI (idempoten) ---------------- */
  function _saktiRow(it, batch, sc, width) {
    var row = []; for (var k = 0; k < width; k++) row[k] = '';
    row[sc.TGL_PB]              = _norm(it.tglPb);
    row[sc.NO_PB]              = _norm(it.noPb);
    row[sc.AKUN_BELANJA]       = _norm(it.akun);
    row[sc.NILAI_AKUN_BELANJA] = Util.num(it.nilai);
    row[sc.NO_KUITANSI]        = _norm(it.noKuitansi);
    row[sc.TGL_KUITANSI]       = _norm(it.tglKuitansi);
    row[sc.NO_DRPP]            = _norm(it.noDrpp);
    row[sc.NO_SPP_SSP]         = _norm(it.noSpp);
    row[sc.STATUS_VALIDASI]    = _norm(it.statusValidasi);
    row[sc.IMPORT_BATCH]       = batch;
    return row;
  }
  function _saktiUpdates(it, batch, sc) {
    return Util.set(
      sc.TGL_PB, _norm(it.tglPb), sc.AKUN_BELANJA, _norm(it.akun),
      sc.NILAI_AKUN_BELANJA, Util.num(it.nilai), sc.TGL_KUITANSI, _norm(it.tglKuitansi),
      sc.NO_DRPP, _norm(it.noDrpp), sc.NO_SPP_SSP, _norm(it.noSpp), sc.IMPORT_BATCH, batch);
  }

  function upsertSakti(list, batch) {
    var name = CONFIG.SHEETS.SAKTI_SPBY;
    SheetRepo.sheet(name);                                // pastikan sheet ada (auto-create)
    var sc = SC(), width = CONFIG.HEADERS.SAKTI_SPBY.length;
    var data = SheetRepo.getData(name);
    var idx = {}, pbToRows = {};                          // dedupKey->rowIndex ; noPb->[rowIndex]
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      idx[_dedupKey(r[sc.NO_PB], r[sc.NO_KUITANSI], r[sc.NILAI_AKUN_BELANJA])] = i + 2;
      var pb0 = _norm(r[sc.NO_PB]); if (pb0) { (pbToRows[pb0] = pbToRows[pb0] || []).push(i + 2); }
    }
    var res = { ditambah: 0, diperbarui: 0 }, pajak = [];
    list = list || [];
    for (var j = 0; j < list.length; j++) {
      var it = list[j];
      if (_isPajak(it.akun)) { pajak.push(it); continue; }      // baris pajak → lampirkan nanti
      var key = _dedupKey(it.noPb, it.noKuitansi, it.nilai);
      if (idx[key]) {
        SheetRepo.setCells(name, idx[key], _saktiUpdates(it, batch, sc));
        res.diperbarui++;
      } else {
        var newRow = SheetRepo.appendRow(name, _saktiRow(it, batch, sc, width));
        idx[key] = newRow;
        var pb = _norm(it.noPb); if (pb) { (pbToRows[pb] = pbToRows[pb] || []).push(newRow); }
        res.ditambah++;
      }
    }
    // Lampirkan baris pajak (411xxx) sebagai atribut baris belanja ber-No PB sama.
    for (var p = 0; p < pajak.length; p++) {
      var pj = pajak[p], rows = pbToRows[_norm(pj.noPb)] || [];
      var upd = Util.set(sc.AKUN_PAJAK, _norm(pj.akun), sc.NILAI_PAJAK, Util.num(pj.nilai),
                         sc.NO_BUKTI_PUNGUT, _norm(pj.noBuktiPungut));
      for (var q = 0; q < rows.length; q++) SheetRepo.setCells(name, rows[q], upd);
    }
    DeferredFlush.mark();
    return res;
  }

  /* ---------------- Mesin cocok Tier 0 ---------------- */
  function cocok(batch) {
    var kName = CONFIG.SHEETS.KAS_TUNAI, sName = CONFIG.SHEETS.SAKTI_SPBY;
    SheetRepo.sheet(sName);
    var sc = SC();

    // Transaksi kas ber-kuitansi (aktif).
    var kData = SheetRepo.getData(kName), txnByKu = {};
    for (var i = 0; i < kData.length; i++) {
      var r = kData[i]; if (isDeleted(r[C.IS_DELETED])) continue;
      var ku = _norm(r[C.NO_KUITANSI]); if (!ku) continue;      // tanpa kuitansi = bukan urusan Fase 2
      (txnByKu[ku] = txnByKu[ku] || []).push({
        no: r[C.NO], rowIndex: i + 2, kredit: Util.num(r[C.KREDIT]),
        noDrpp: _norm(r[C.NO_DRPP]), noSpp: _norm(r[C.NO_SPP]), status: _norm(r[C.STATUS_REKON])
      });
    }

    // Baris SAKTI belanja ber-kuitansi (bukan 411xxx).
    var sData = SheetRepo.getData(sName), saktiByKu = {};
    for (var j = 0; j < sData.length; j++) {
      var s = sData[j];
      if (_isPajak(s[sc.AKUN_BELANJA])) continue;
      var ku2 = _norm(s[sc.NO_KUITANSI]); if (!ku2) continue;
      (saktiByKu[ku2] = saktiByKu[ku2] || []).push({
        rowIndex: j + 2, nilai: Util.num(s[sc.NILAI_AKUN_BELANJA]),
        noPb: _norm(s[sc.NO_PB]), noDrpp: _norm(s[sc.NO_DRPP]), noSpp: _norm(s[sc.NO_SPP_SSP])
      });
    }

    var sum = { saktiDiproses: sData.length, cocok: 0, nilaiBeda: 0, tanpaPadanan: 0,
                konflik: 0, batch: batch, listNilaiBeda: [], listKonflik: [] };

    for (var ku in txnByKu) {
      if (!txnByKu.hasOwnProperty(ku)) continue;
      var txns = txnByKu[ku], saktis = saktiByKu[ku] || [];
      if (saktis.length === 0) {                               // kuitansi tak ada di SAKTI → BELUM
        for (var t = 0; t < txns.length; t++)
          if (txns[t].status === '') SheetRepo.setCells(kName, txns[t].rowIndex, Util.set(C.STATUS_REKON, 'BELUM'));
        continue;
      }
      if (txns.length > 1 || saktis.length > 1) {              // KONFLIK — jangan auto-assign
        sum.konflik++;
        sum.listKonflik.push({ kuitansi: ku, txn: txns.length, sakti: saktis.length });
        continue;
      }
      var tx = txns[0], sk = saktis[0];
      if (tx.status === 'COCOK') continue;                     // idempoten: sudah cocok, lewati
      if (Math.round(tx.kredit) === Math.round(sk.nilai)) {    // COCOK (nilai sama persis)
        var upd = Util.set(C.STATUS_REKON, 'COCOK', C.REKON_REF_PB, sk.noPb, C.REKON_BATCH, batch);
        if (!tx.noDrpp && sk.noDrpp) upd[C.NO_DRPP] = sk.noDrpp;   // backfill bila kosong
        if (!tx.noSpp && sk.noSpp) upd[C.NO_SPP] = sk.noSpp;
        SheetRepo.setCells(kName, tx.rowIndex, upd);
        SheetRepo.setCells(sName, sk.rowIndex, Util.set(sc.MATCHED, 'Y', sc.MATCHED_TXN_NO, tx.no));
        sum.cocok++;
      } else {                                                 // NILAI_BEDA (flag, bukan COCOK)
        SheetRepo.setCells(kName, tx.rowIndex,
          Util.set(C.STATUS_REKON, 'NILAI_BEDA', C.REKON_REF_PB, sk.noPb, C.REKON_BATCH, batch));
        sum.nilaiBeda++;
        sum.listNilaiBeda.push({ kuitansi: ku, no: tx.no, kredit: tx.kredit,
          nilaiSakti: sk.nilai, selisih: Util.num(tx.kredit) - Util.num(sk.nilai) });
      }
    }

    // SAKTI belanja yang kuitansinya tak ada di transaksi mana pun.
    for (var kk in saktiByKu) {
      if (!saktiByKu.hasOwnProperty(kk)) continue;
      if (!txnByKu[kk]) sum.tanpaPadanan += saktiByKu[kk].length;
    }
    DeferredFlush.mark();
    return sum;
  }

  /* ---------------- Entry point publik ---------------- */
  /** Impor + langsung cocokkan. Kembalikan ringkasan (dengan angka upsert). */
  function impor(list) {
    var batch = _batchId();
    var up = upsertSakti(list, batch);
    var sum = cocok(batch);
    sum.saktiDitambah = up.ditambah;
    sum.saktiDiperbarui = up.diperbarui;
    return sum;
  }
  /** Jalankan ulang pencocokan saja (tanpa impor baru). */
  function cocokUlang() { return cocok(_batchId()); }

  return { impor: impor, cocok: cocokUlang, upsertSakti: upsertSakti };
})();
