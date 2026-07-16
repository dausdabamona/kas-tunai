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
  /** Kanonisasi ID agar tahan koersi tipe Google Sheets: teks "00001" bisa
   *  tersimpan sbg angka 1. Angka murni → parseInt (buang nol depan); selain itu
   *  teks di-trim + huruf besar. Konsisten utk baris lama & baru. */
  function _keyText(v) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s.toUpperCase();
  }
  /** Kunci dedup baris SAKTI = No PB | No Kuitansi | Nilai (tanpa tanggal). */
  function _dedupKey(noPb, noKuitansi, nilai) {
    return _keyText(noPb) + '|' + _keyText(noKuitansi) + '|' + Math.round(Util.num(nilai));
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
    var idx = {};                                         // dedupKey -> rowIndex (1-based)
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      idx[_dedupKey(r[sc.NO_PB], r[sc.NO_KUITANSI], r[sc.NILAI_AKUN_BELANJA])] = i + 2;
    }
    // Simpan SETIAP baris data sbg baris SAKTI_SPBy (termasuk baris pajak 411xxx —
    // dikecualikan dari pencocokan oleh engine, bukan dibuang). Idempoten: kunci
    // sudah ada → update; belum → tambah.
    var res = { ditambah: 0, diperbarui: 0 };
    list = list || [];
    for (var j = 0; j < list.length; j++) {
      var it = list[j];
      var key = _dedupKey(it.noPb, it.noKuitansi, it.nilai);
      if (idx[key]) {
        SheetRepo.setCells(name, idx[key], _saktiUpdates(it, batch, sc));
        res.diperbarui++;
      } else {
        idx[key] = SheetRepo.appendRow(name, _saktiRow(it, batch, sc, width));
        res.ditambah++;
      }
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

  /* ---------------- Backfill Kuitansi massal ---------------- */
  /** Isi No Kuitansi/DRPP/SPP pada transaksi (cocok by kolom No) HANYA bila sel
   *  kosong — tidak pernah menimpa. Sel terisi & beda → dicatat "bentrok".
   *  list item: {noTransaksi, noKuitansi, noDrpp, noSpp}. Idempoten. */
  function backfillKuitansi(list) {
    var kName = CONFIG.SHEETS.KAS_TUNAI, data = SheetRepo.getData(kName);
    var byNo = {};
    for (var i = 0; i < data.length; i++) {
      var r = data[i]; if (isDeleted(r[C.IS_DELETED])) continue;
      byNo[_keyText(r[C.NO])] = { rowIndex: i + 2,
        ku: _norm(r[C.NO_KUITANSI]), dr: _norm(r[C.NO_DRPP]), sp: _norm(r[C.NO_SPP]) };
    }
    var sum = { diproses: 0, diisi: 0, bentrok: 0, takDitemukan: 0,
                listBentrok: [], listTakDitemukan: [] };
    list = list || [];
    for (var j = 0; j < list.length; j++) {
      var it = list[j], no = _norm(it.noTransaksi);
      if (!no) continue;
      sum.diproses++;
      var t = byNo[_keyText(no)];
      if (!t) { sum.takDitemukan++; sum.listTakDitemukan.push(no); continue; }
      var upd = {}, ctx = { filled: false, conflict: false, detail: [] };
      _fill(t.ku, it.noKuitansi, C.NO_KUITANSI, 'No Kuitansi', upd, ctx);
      _fill(t.dr, it.noDrpp, C.NO_DRPP, 'No DRPP', upd, ctx);
      _fill(t.sp, it.noSpp, C.NO_SPP, 'No SPP', upd, ctx);
      var keys = []; for (var k in upd) keys.push(k);
      if (keys.length) { SheetRepo.setCells(kName, t.rowIndex, upd); sum.diisi++; }
      if (ctx.conflict) { sum.bentrok++; sum.listBentrok.push({ no: no, detail: ctx.detail.join('; ') }); }
    }
    DeferredFlush.mark();
    try { AuditLog.write('BACKFILL', kName, '-', sum.diisi + ' diisi, ' + sum.bentrok + ' bentrok'); } catch (e) {}
    return sum;
  }
  /** Isi satu kolom bila kosong; catat bentrok bila terisi & beda. */
  function _fill(cur, inc, col, label, upd, ctx) {
    inc = _norm(inc); if (!inc) return;                          // tak ada data masuk
    if (!cur) { upd[col] = inc; ctx.filled = true; return; }      // kosong → isi
    if (_keyText(cur) === _keyText(inc)) return;                  // sudah sama → no-op
    ctx.conflict = true; ctx.detail.push(label + ': "' + cur + '" != "' + inc + '"');  // beda → bentrok, jangan timpa
  }

  /* ---------------- Ringkasan Fase 3 (baca status, tak hitung ulang) ---------------- */
  /** Transaksi rekonsiliabel = pengeluaran (kredit>0) yang BUKAN pindah dana (TF-)
   *  maupun mutasi bank (RK-). Selebihnya NON_REKON (tak dihitung lencana). */
  function _rekonabel(t) {
    var ref = String(t.refTransfer || '');
    return Util.num(t.kredit) > 0 && ref.indexOf('TF-') !== 0 && ref.indexOf('RK-') !== 0;
  }
  function _statusRekonOf(t) {
    if (!_rekonabel(t)) return 'NON_REKON';
    var s = String(t.statusRekon || '').toUpperCase();
    return (s === 'COCOK' || s === 'NILAI_BEDA') ? s : 'BELUM';
  }
  /** Parse IMPORT_BATCH 'ByyyyMMdd-HHmmss' → {tanggal, hariLalu}. */
  function _parseBatch(b) {
    if (!b) return null;
    var m = String(b).match(/(\d{4})(\d{2})(\d{2})/);
    if (!m) return { tanggal: String(b), hariLalu: null };
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return { tanggal: Util.fmtDate(d),
             hariLalu: Math.floor((new Date().getTime() - d.getTime()) / 86400000) };
  }

  /** Ringkasan rekonsiliasi utk Kartu Ketenangan (beranda). Baca Status Rekon +
   *  saldo yang sudah dihitung + impor SAKTI terakhir. periode '' = semua. */
  function ringkasan(periode) {
    var tx = KasTunai.getTransaksi(), saldo = KasTunai.ringkasanSaldo();
    var sName = CONFIG.SHEETS.SAKTI_SPBY;
    SheetRepo.sheet(sName);
    var sc = SC(), sData = SheetRepo.getData(sName), saktiByKu = {}, lastBatch = '';
    for (var i = 0; i < sData.length; i++) {
      var s = sData[i], b = String(s[sc.IMPORT_BATCH] || '');
      if (b > lastBatch) lastBatch = b;
      if (_isPajak(s[sc.AKUN_BELANJA])) continue;
      var ku = _keyText(s[sc.NO_KUITANSI]); if (!ku) continue;
      if (!(ku in saktiByKu)) saktiByKu[ku] = Util.num(s[sc.NILAI_AKUN_BELANJA]);
    }
    var counts = { cocok: 0, belum: 0, nilaiBeda: 0, nonRekon: 0 }, nilaiBeda = [];
    for (var j = 0; j < tx.length; j++) {
      var t = tx[j];
      if (periode && String(t.tanggal || '').slice(0, 7) !== periode) continue;
      var st = _statusRekonOf(t);
      if (st === 'NON_REKON') { counts.nonRekon++; continue; }
      if (st === 'COCOK') { counts.cocok++; }
      else if (st === 'NILAI_BEDA') {
        counts.nilaiBeda++;
        var kk = _keyText(t.noKuitansi), ns = (kk in saktiByKu) ? saktiByKu[kk] : 0;
        nilaiBeda.push({ no: t.no, kegiatan: t.kegiatan, tanggal: t.tanggal,
          kredit: Util.num(t.kredit), nilaiSakti: ns, selisih: Util.num(t.kredit) - ns,
          refPb: t.rekonRefPb || '', kuitansi: t.noKuitansi || '' });
      } else { counts.belum++; }
    }
    return { saldo: { tunai: saldo.saldoTunai, bank: saldo.saldoBank, total: saldo.saldoTotal },
             counts: counts, lastImport: _parseBatch(lastBatch), nilaiBeda: nilaiBeda };
  }

  return { impor: impor, cocok: cocokUlang, upsertSakti: upsertSakti,
           backfillKuitansi: backfillKuitansi, ringkasan: ringkasan };
})();
