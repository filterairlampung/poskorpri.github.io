// ==========================================
// KONFIGURASI UTAMA SPREADSHEET
// ==========================================
var SPREADSHEET_ID = "1641aeDVFxTD7XMmx9fvhzxFLVzzYYaNE76rj6ruXoj0";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// ==========================================
// HELPER FORMAT & PARSING TANGGAL AMAN
// ==========================================
function formatTglAman(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+7", "dd/MM/yyyy");
  }
  var str = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    var p = str.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  return str;
}

function formatWaktuAman(val) {
  if (!val) return "-";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT+7", "HH:mm:ss");
  }
  return val.toString().trim();
}

function parseDateSafe(val) {
  if (!val) return new Date(0);
  if (val instanceof Date) return new Date(val.getTime());
  var str = val.toString().trim();
  if (str.indexOf("/") !== -1) {
    var p = str.split("/");
    return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  }
  return new Date(str);
}

function parseTglSort(str) {
  if (!str || str.indexOf("/") === -1) return 0;
  var p = str.split("/");
  return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10)).getTime();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 1. ROUTER REST API (doGet & doPost) UNTUK PWA MANDIRI
// ==========================================
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      var res = handleApiRequest(e.parameter.action, e.parameter);
      return jsonResponse(res);
    }
    // Fallback jika dibuka langsung di browser tanpa parameter action
    return jsonResponse({
      status: "sukses",
      pesan: "Backend API POS Al-Kautsar Filter Air Aktif."
    });
  } catch (err) {
    return jsonResponse({ status: "gagal", pesan: "GET Error: " + err.message });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || (e && e.parameter ? e.parameter.action : "");
    if (!action) {
      return jsonResponse({ status: "gagal", pesan: "Parameter 'action' tidak ditemukan." });
    }
    var res = handleApiRequest(action, body);
    return jsonResponse(res);
  } catch (err) {
    return jsonResponse({ status: "gagal", pesan: "POST Error: " + err.message });
  }
}

function handleApiRequest(action, payload) {
  switch (action) {
    case "prosesLogin":
      return prosesLogin(payload.username, payload.password);
    case "getProduk":
      return getProduk();
    case "getDashboardData":
      return getDashboardData();
    case "simpanTransaksi":
      return simpanTransaksi(payload.data);
    case "simpanArusKas":
      return simpanArusKas(payload.data);
    case "simpanMutasiBatch":
      return simpanMutasiBatch(payload.data);
    case "tambahProdukBaru":
      return tambahProdukBaru(payload.data);
    case "lunasiHutang":
      return lunasiHutang(payload.idTrx, Number(payload.nominalCicilan), payload.metodeCicilan);
    case "batalkanTransaksi":
      return batalkanTransaksi(payload.idTrx);
    case "getDetailTransaksi":
      return getDetailTransaksi(payload.idTrx);
    case "getDetailForEdit":
      return getDetailForEdit(payload.id, payload.jenis);
    case "simpanUpdateEdit":
      return simpanUpdateEdit(payload.id, payload.jenis, payload.dataLama, payload.dataBaru);
    case "batalkanBarangMasuk":
      return batalkanBarangMasuk(payload.idRestock);
    case "hapusArusKas":
      return hapusArusKas(payload.idKas);
    case "getDaftarNgampasTerintegrasi":
      return getDaftarNgampasTerintegrasi();
    case "selesaikanNgampasTerintegrasi":
      return selesaikanNgampasTerintegrasi(
        payload.idTrx,
        payload.dataRetur || [],
        Number(payload.setoranAktual),
        Number(payload.diskonMurni),
        payload.metodeSetoran || "Tunai"
      );
    case "getDaftarPiutangAktif":
      return getDaftarPiutangAktif();
    case "getLaporanPenjualanLengkap":
      return getLaporanPenjualanLengkap(payload.startDate, payload.endDate);
    case "getLaporanStokLengkap":
      return getLaporanStokLengkap();
    case "getLaporanPengeluaranLengkap":
      return getLaporanPengeluaranLengkap(payload.startDate, payload.endDate);
    case "getLaporanPiutangLengkap":
      return getLaporanPiutangLengkap(payload.startDate, payload.endDate);
    case "getPengaturanToko":
      return getPengaturanToko();
    case "simpanPengaturanToko":
      return simpanPengaturanToko(payload.data);
    case "tutupKasManualSistem":
      return tutupKasManualSistem();
    case "tutupKasMasaLaluSistem":
      return tutupKasMasaLaluSistem(payload.tanggalStr);
    case "getSaldoAwal":
      return getSaldoAwal(payload.targetDateStr);
    default:
      return { status: "gagal", pesan: "Action API tidak dikenal: " + action };
  }
}

// ==========================================
// 2. FUNGSI LOGIN
// ==========================================
function prosesLogin(username, password) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Users");
    if (!sheet) return { status: "gagal", pesan: "Sheet 'Users' tidak ditemukan." };

    var userClean = (username || "").toString().trim();
    var passClean = (password || "").toString().trim();

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === userClean && data[i][1].toString().trim() === passClean) {
        return {
          status: "sukses",
          role: data[i][2].toString().trim(),
          nama: data[i][3].toString().trim()
        };
      }
    }
    return { status: "gagal", pesan: "Username atau Password salah!" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 3. FUNGSI AMBIL DATA PRODUK & HARGA KHUSUS (UPDATE POIN 1)
// ==========================================
function getProduk() {
  try {
    var ss = getSpreadsheet();
    var sheetMaster = ss.getSheetByName("Master Barang");
    var sheetKhusus = ss.getSheetByName("Harga Khusus");

    var dataMaster = sheetMaster.getDataRange().getValues();
    var produkList = [];
    var kamusBarang = {};

    for (var i = 1; i < dataMaster.length; i++) {
      if (dataMaster[i][0] !== "") {
        var idBrg = dataMaster[i][0].toString();
        var namaBrg = dataMaster[i][1].toString();
        var hrgJual = parseInt(dataMaster[i][4], 10) || 0;

        kamusBarang[idBrg] = { nama: namaBrg, hargaNormal: hrgJual };

        produkList.push({
          id: idBrg,
          nama: namaBrg,
          kategori: (dataMaster[i][2] || "Umum").toString(),
          hargaModal: parseInt(dataMaster[i][3], 10) || 0,
          hargaJual: hrgJual,
          stok: parseInt(dataMaster[i][9], 10) || 0
        });
      }
    }

    var hargaKhususList = [];
    if (sheetKhusus) {
      var dataKhusus = sheetKhusus.getDataRange().getValues();
      for (var k = 1; k < dataKhusus.length; k++) {
        if (dataKhusus[k][0] !== "") {
          var namaAsli = dataKhusus[k][0].toString().trim();
          var idB = dataKhusus[k][1].toString().trim();
          var infoBrg = kamusBarang[idB] || { nama: "Barang (" + idB + ")", hargaNormal: 0 };

          hargaKhususList.push({
            pelanggan: namaAsli.toLowerCase(),
            pelangganAsli: namaAsli,
            idBarang: idB,
            namaBarang: infoBrg.nama,
            hargaNormal: infoBrg.hargaNormal,
            harga: parseInt(dataKhusus[k][2], 10) || 0
          });
        }
      }
    }
    return { status: "sukses", data: produkList, dataHargaKhusus: hargaKhususList };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 4. FUNGSI SIMPAN TRANSAKSI (DP, LUNAS & AUTO-SETOR)
// ==========================================
function simpanTransaksi(dataPenjualan) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetDetail = ss.getSheetByName("Detail Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");
    var sheetMaster = ss.getSheetByName("Master Barang");

    var timestamp = new Date();
    var idTrx = "TRX-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
    var tanggal = dataPenjualan.tanggalCustom
      ? dataPenjualan.tanggalCustom.split("-").reverse().join("/")
      : Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");
    var waktu = Utilities.formatDate(timestamp, "GMT+7", "HH:mm:ss");

    var totalBelanja = parseInt(dataPenjualan.totalBelanja, 10) || 0;
    var bayar = parseInt(dataPenjualan.bayar, 10) || 0;
    var kembalian = parseInt(dataPenjualan.kembalian, 10) || 0;

    var masterData = sheetMaster.getDataRange().getValues();
    var totalModalSemua = 0;
    var barisDetailBaru = [];

    for (var i = 0; i < dataPenjualan.keranjang.length; i++) {
      var item = dataPenjualan.keranjang[i];
      var qtyItem = parseInt(item.qty, 10) || 0;
      var hargaItem = parseInt(item.harga, 10) || 0;
      var subtotalItem = parseInt(item.subtotal, 10) || (qtyItem * hargaItem);
      var hargaModalItem = 0;

      for (var j = 1; j < masterData.length; j++) {
        if (masterData[j][0].toString() === item.id.toString()) {
          hargaModalItem = parseInt(masterData[j][3], 10) || 0;
          var stokLama = parseInt(masterData[j][9], 10) || 0;
          var stokBaru = stokLama - qtyItem;
          masterData[j][9] = stokBaru;
          sheetMaster.getRange(j + 1, 10).setValue(stokBaru);
          break;
        }
      }
      var totalModal = hargaModalItem * qtyItem;
      totalModalSemua += totalModal;
      barisDetailBaru.push([
        idTrx,
        item.id,
        item.nama,
        hargaItem,
        qtyItem,
        subtotalItem,
        totalModal,
        subtotalItem - totalModal
      ]);
    }

    if (barisDetailBaru.length > 0) {
      sheetDetail
        .getRange(sheetDetail.getLastRow() + 1, 1, barisDetailBaru.length, barisDetailBaru[0].length)
        .setValues(barisDetailBaru);
    }

    var labaNota = totalBelanja - totalModalSemua;
    sheetTrx.appendRow([
      idTrx,
      tanggal,
      waktu,
      dataPenjualan.kasir,
      dataPenjualan.pelanggan,
      dataPenjualan.metode,
      dataPenjualan.status,
      totalBelanja,
      bayar,
      kembalian,
      labaNota
    ]);

    // --- PENCATATAN ARUS KAS: DP & LUNAS + AUTO-SETOR ---
    var idKas = "KAS-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
    var kasMasuk = 0;
    var jenisKas = "Penjualan Kasir";
    var ketTambahan = "";

    if (dataPenjualan.status === "Hutang") {
      kasMasuk = bayar; // Nilai DP jika ada
      if (kasMasuk > 0) {
        jenisKas = "Pemasukan DP";
        ketTambahan = " (Uang Muka via " + dataPenjualan.metode + ")";
      }
    } else {
      kasMasuk = totalBelanja; // Jika Lunas
    }

    if (kasMasuk > 0) {
      sheetKas.appendRow([
        idKas,
        tanggal,
        "Pemasukan",
        jenisKas,
        "Nota: " + idTrx + ketTambahan,
        kasMasuk,
        0,
        ""
      ]);

      var metodeLower = (dataPenjualan.metode || "").toString().toLowerCase();
      if (metodeLower === "transfer" || metodeLower === "qris" || metodeLower === "shopee") {
        var idKasAuto = idKas + "-AUT";
        sheetKas.appendRow([
          idKasAuto,
          tanggal,
          "Pengeluaran",
          "Setoran",
          "Auto-Setor (" + dataPenjualan.metode + ") - Nota: " + idTrx,
          0,
          kasMasuk,
          ""
        ]);
      }
    }

    return { status: "sukses", nota: idTrx };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 5. FUNGSI SIMPAN & HAPUS ARUS KAS
// ==========================================
function simpanArusKas(data) {
  try {
    var ss = getSpreadsheet();
    var sheetKas = ss.getSheetByName("Arus Kas");

    var timestamp = new Date();
    var idKas = "KAS-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
    var tanggal = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");

    if (data.tanggalCustom && data.tanggalCustom !== "") {
      var p = data.tanggalCustom.split("-");
      if (p.length === 3) {
        tanggal = p[2] + "/" + p[1] + "/" + p[0];
      }
    }

    var nominal = parseInt(data.nominal, 10) || 0;
    var masuk = data.kategori === "Pemasukan" ? nominal : 0;
    var keluar = data.kategori === "Pengeluaran" ? nominal : 0;

    sheetKas.appendRow([idKas, tanggal, data.kategori, data.jenis, data.keterangan, masuk, keluar, ""]);
    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function hapusArusKas(idKas) {
  try {
    var ss = getSpreadsheet();
    var sheetKas = ss.getSheetByName("Arus Kas");
    var finder = sheetKas.createTextFinder(idKas).matchEntireCell(false).findNext();
    if (!finder) return { status: "gagal", pesan: "Data Arus Kas tidak ditemukan." };
    sheetKas.deleteRow(finder.getRow());
    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 6. FUNGSI PELUNASAN HUTANG (CICILAN PARSIAL + AUTO-SETOR)
// ==========================================
function lunasiHutang(idTrx, nominalCicilan, metodeCicilan) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");

    var trxData = sheetTrx.getDataRange().getValues();
    var totalBelanja = 0;
    var sudahBayar = 0;
    var sisaHutang = 0;
    var namaPelanggan = "Umum";
    var rowToUpdate = -1;

    for (var i = 1; i < trxData.length; i++) {
      if (trxData[i][0] && trxData[i][0].toString() === idTrx) {
        rowToUpdate = i + 1;
        namaPelanggan = trxData[i][4] ? trxData[i][4].toString() : "Umum";
        totalBelanja = parseInt(trxData[i][7], 10) || 0;
        sudahBayar = parseInt(trxData[i][8], 10) || 0;
        sisaHutang = totalBelanja - sudahBayar;
        break;
      }
    }

    if (rowToUpdate === -1) return { status: "gagal", pesan: "Transaksi tidak ditemukan." };
    if (sisaHutang <= 0) return { status: "gagal", pesan: "Nota ini sudah lunas sebelumnya." };

    nominalCicilan = parseInt(nominalCicilan, 10) || 0;
    if (nominalCicilan <= 0) return { status: "gagal", pesan: "Nominal pembayaran tidak valid." };
    if (nominalCicilan > sisaHutang) nominalCicilan = sisaHutang;

    var totalBayarBaru = sudahBayar + nominalCicilan;
    var sisaHutangBaru = totalBelanja - totalBayarBaru;

    sheetTrx.getRange(rowToUpdate, 9).setValue(totalBayarBaru);

    var ketPelunasan = "Cicilan Hutang (" + namaPelanggan + ")";
    if (sisaHutangBaru <= 0) {
      ketPelunasan = "Pelunasan Hutang Lunas 100% (" + namaPelanggan + ")";
      sheetTrx.getRange(rowToUpdate, 7).setValue("Dilunasi");
      sheetTrx.getRange(rowToUpdate, 10).setValue(0);
    }

    var timestamp = new Date();
    var idKas = "KAS-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
    var tanggal = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");

    sheetKas.appendRow([
      idKas,
      tanggal,
      "Pemasukan",
      "Pelunasan Hutang",
      "Nota: " + idTrx + " - " + ketPelunasan,
      nominalCicilan,
      0,
      ""
    ]);

    if (metodeCicilan && (metodeCicilan === "Transfer" || metodeCicilan === "Qris")) {
      var idKasAuto = idKas + "-AUT";
      sheetKas.appendRow([
        idKasAuto,
        tanggal,
        "Pengeluaran",
        "Setoran",
        "Auto-Setor (" + metodeCicilan + ") Pelunasan - Nota: " + idTrx,
        0,
        nominalCicilan,
        ""
      ]);
    }

    return { status: "sukses", sisa: sisaHutangBaru };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 7. BATALKAN & AMBIL DETAIL TRANSAKSI
// ==========================================
function batalkanTransaksi(idTrx) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetDetail = ss.getSheetByName("Detail Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");
    var sheetMaster = ss.getSheetByName("Master Barang");

    var detailData = sheetDetail.getDataRange().getValues();
    var masterData = sheetMaster.getDataRange().getValues();

    for (var i = detailData.length - 1; i >= 1; i--) {
      if (detailData[i][0] && detailData[i][0].toString() === idTrx) {
        var idBarang = detailData[i][1].toString();
        var qty = parseInt(detailData[i][4], 10) || 0;

        for (var m = 1; m < masterData.length; m++) {
          if (masterData[m][0].toString() === idBarang) {
            var stokLama = parseInt(sheetMaster.getRange(m + 1, 10).getValue(), 10) || 0;
            sheetMaster.getRange(m + 1, 10).setValue(stokLama + qty);
            break;
          }
        }
        sheetDetail.deleteRow(i + 1);
      }
    }

    var trxData = sheetTrx.getDataRange().getValues();
    for (var t = trxData.length - 1; t >= 1; t--) {
      if (trxData[t][0] && trxData[t][0].toString() === idTrx) {
        sheetTrx.deleteRow(t + 1);
        break;
      }
    }

    var kasData = sheetKas.getDataRange().getValues();
    for (var k = kasData.length - 1; k >= 1; k--) {
      if (kasData[k][4] && kasData[k][4].toString().indexOf(idTrx) !== -1) {
        sheetKas.deleteRow(k + 1);
      }
    }

    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function getDetailTransaksi(idTrx) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetDetail = ss.getSheetByName("Detail Transaksi");

    var dataHeader = {};
    var keranjang = [];

    if (sheetTrx) {
      var trxData = sheetTrx.getDataRange().getValues();
      for (var i = 1; i < trxData.length; i++) {
        if (trxData[i][0].toString() === idTrx) {
          dataHeader = {
            idTrx: trxData[i][0].toString(),
            tanggal: formatTglAman(trxData[i][1]),
            waktu: formatWaktuAman(trxData[i][2]),
            kasir: trxData[i][3].toString(),
            pelanggan: trxData[i][4] ? trxData[i][4].toString() : "Umum",
            metode: trxData[i][5].toString(),
            status: trxData[i][6].toString(),
            totalBelanja: parseInt(trxData[i][7], 10) || 0,
            bayar: parseInt(trxData[i][8], 10) || 0,
            kembalian: parseInt(trxData[i][9], 10) || 0
          };
          break;
        }
      }
    }

    if (sheetDetail) {
      var detailData = sheetDetail.getDataRange().getValues();
      var subtotalAsli = 0;
      for (var j = 1; j < detailData.length; j++) {
        if (detailData[j][0].toString() === idTrx) {
          var subItem = parseInt(detailData[j][5], 10) || 0;
          keranjang.push({
            id: detailData[j][1].toString(),
            nama: detailData[j][2].toString(),
            harga: parseInt(detailData[j][3], 10) || 0,
            qty: parseInt(detailData[j][4], 10) || 0,
            subtotal: subItem
          });
          subtotalAsli += subItem;
        }
      }
      dataHeader.totalAsli = subtotalAsli;
      dataHeader.diskon = subtotalAsli - dataHeader.totalBelanja;
      if (dataHeader.diskon < 0) dataHeader.diskon = 0;
    }

    if (Object.keys(dataHeader).length === 0) {
      return { status: "gagal", pesan: "Data transaksi tidak ditemukan di database" };
    }

    return { status: "sukses", header: dataHeader, detail: keranjang };
  } catch (e) {
    return { status: "gagal", pesan: "Error Sistem: " + e.message };
  }
}

// ==========================================
// 8. FUNGSI AMBIL DATA DASHBOARD UTAMA & RIWAYAT
// ==========================================
function getDashboardData() {
  try {
    var ss = getSpreadsheet();
    var stokTipis = [];
    var riwayatGabungan = [];
    var totalPenjualan = 0;
    var totalPiutang = 0;
    var totalPengeluaran = 0;

    function formatRp(angka) {
      return "Rp " + Number(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // 1. Tarik rincian barang dari Detail Transaksi
    var detailKeranjang = {};
    try {
      var sheetDetail = ss.getSheetByName("Detail Transaksi");
      if (sheetDetail) {
        var detailData = sheetDetail.getDataRange().getValues();
        for (var d = 1; d < detailData.length; d++) {
          if (detailData[d][0] && detailData[d][0].toString().trim() !== "") {
            var idNota = detailData[d][0].toString();
            var namaBrg = detailData[d][2] ? detailData[d][2].toString() : detailData[d][1].toString();
            var hargaBrg = parseInt(detailData[d][3], 10) || 0;
            var qtyBrg = parseInt(detailData[d][4], 10) || 0;

            var teksItem = "• " + namaBrg + " (" + qtyBrg + " x " + formatRp(hargaBrg) + ")";
            if (!detailKeranjang[idNota]) {
              detailKeranjang[idNota] = [];
            }
            detailKeranjang[idNota].push(teksItem);
          }
        }
      }
    } catch (errDetail) {}

    // 2. Cek Stok Menipis di Master Barang
    try {
      var sheetMaster = ss.getSheetByName("Master Barang");
      if (sheetMaster) {
        var masterData = sheetMaster.getDataRange().getValues();
        for (var i = 1; i < masterData.length; i++) {
          if (masterData[i][0] && masterData[i][0].toString().trim() !== "") {
            var stok = parseInt(masterData[i][9], 10);
            if (!isNaN(stok) && stok < 10) {
              stokTipis.push({ nama: masterData[i][1].toString(), stok: stok });
            }
          }
        }
      }
    } catch (e1) {}

    // 3. Tarik Riwayat Transaksi Penjualan
    try {
      var sheetTrx = ss.getSheetByName("Transaksi");
      if (sheetTrx) {
        var trxData = sheetTrx.getDataRange().getValues();
        for (var j = 1; j < trxData.length; j++) {
          if (trxData[j][0] && trxData[j][0].toString().trim() !== "") {
            var idTransaksi = trxData[j][0].toString();
            var tgl = formatTglAman(trxData[j][1]);
            var wkt = formatWaktuAman(trxData[j][2]);
            var nominal = parseInt(trxData[j][7], 10) || 0;
            var dibayar = parseInt(trxData[j][8], 10) || 0;
            var statusTrx = trxData[j][6] ? trxData[j][6].toString() : "";
            var daftarBarang = detailKeranjang[idTransaksi] ? detailKeranjang[idTransaksi].join("<br>") : "-";

            riwayatGabungan.push({
              id: idTransaksi,
              tanggal: tgl,
              waktu: wkt,
              jenis: "Penjualan",
              detailBarang: daftarBarang,
              rincian: "Pelanggan: " + (trxData[j][4] ? trxData[j][4].toString() : "Umum"),
              nominal: nominal,
              dibayar: dibayar,
              status: statusTrx,
              rawDate: tgl
            });

            totalPenjualan += nominal;
            if (statusTrx === "Hutang") {
              var sisaHtg = nominal - dibayar;
              if (sisaHtg > 0) totalPiutang += sisaHtg;
            }
          }
        }
      }
    } catch (e2) {}

    // 4. Tarik Riwayat Barang Masuk / Keluar
    try {
      var sheetMasuk = ss.getSheetByName("Barang Masuk");
      if (sheetMasuk) {
        var mskData = sheetMasuk.getDataRange().getValues();
        for (var m = 1; m < mskData.length; m++) {
          if (mskData[m][0] && mskData[m][0].toString().trim() !== "") {
            var tglMasuk = formatTglAman(mskData[m][1]);
            var namaBrgMsk = mskData[m][4].toString();
            var qtyMsk = mskData[m][5].toString();

            riwayatGabungan.push({
              id: mskData[m][0].toString(),
              tanggal: tglMasuk,
              waktu: "-",
              jenis: "Barang Masuk",
              detailBarang: "• " + namaBrgMsk + " (" + qtyMsk + " qty)",
              rincian: mskData[m][6] ? mskData[m][6].toString() : "-",
              nominal: 0,
              status: "Stok",
              rawDate: tglMasuk
            });
          }
        }
      }
    } catch (e3) {}

    // 5. Tarik Riwayat Arus Kas
    try {
      var sheetKas = ss.getSheetByName("Arus Kas");
      if (sheetKas) {
        var kasData = sheetKas.getDataRange().getValues();
        for (var k = 1; k < kasData.length; k++) {
          if (kasData[k][0] && kasData[k][0].toString().trim() !== "" && kasData[k][3] !== "Penjualan Kasir") {
            var jenisKas = kasData[k][2] ? kasData[k][2].toString() : "";
            var nom = jenisKas === "Pengeluaran"
              ? (parseInt(kasData[k][6], 10) || 0)
              : (parseInt(kasData[k][5], 10) || 0);
            var tglKas = formatTglAman(kasData[k][1]);

            riwayatGabungan.push({
              id: kasData[k][0].toString(),
              tanggal: tglKas,
              waktu: "-",
              jenis: "Arus Kas (" + jenisKas + ")",
              detailBarang: "-",
              rincian: kasData[k][3].toString() + " - " + kasData[k][4].toString(),
              nominal: nom,
              status: jenisKas || "Arus Kas",
              rawDate: tglKas
            });

            if (jenisKas === "Pengeluaran") totalPengeluaran += nom;
          }
        }
      }
    } catch (e4) {}

    riwayatGabungan.reverse();

    var rekapLaporan = {
      penjualan: totalPenjualan,
      piutang: totalPiutang,
      pengeluaran: totalPengeluaran,
      kasBersih: totalPenjualan - totalPengeluaran
    };

    return { status: "sukses", stokTipis: stokTipis, riwayat: riwayatGabungan, laporan: rekapLaporan };
  } catch (e) {
    return { status: "gagal", pesan: "Error: " + e.message };
  }
}

// ==========================================
// 9. LAPORAN PENJUALAN & PEMASUKAN LENGKAP (UPDATE POIN 2 & 3)
// ==========================================
function getLaporanPenjualanLengkap(startDateStr, endDateStr) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetDetail = ss.getSheetByName("Detail Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");

    var startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
    var endD = new Date(endDateStr); endD.setHours(23, 59, 59, 999);

    var res = {
      pemasukan_total: 0,
      pengeluaran_total: 0,
      ringkasan: { penjualan: 0, laba: 0, modal: 0, transaksi: 0, diskon: 0, item: 0, pemasukan_lain: 0 },
      harian: {},
      produk: {},
      pelanggan: {},
      riwayat_gabungan: [] // Menyimpan daftar detail untuk fitur Search Rekapitulasi Ibu
    };

    // 1. Cek Arus Kas (Pemasukan di Luar Penjualan Kasir & Pengeluaran)
    if (sheetKas) {
      var kasData = sheetKas.getDataRange().getValues();
      for (var k = 1; k < kasData.length; k++) {
        if (kasData[k][0] !== "") {
          var dKas = parseDateSafe(kasData[k][1]);
          if (dKas >= startD && dKas <= endD) {
            var idKas = kasData[k][0].toString();
            var tglKasFmt = Utilities.formatDate(dKas, "GMT+7", "dd/MM/yyyy");
            var kategoriKas = kasData[k][2];
            var jenisKas = (kasData[k][3] || "").toString();
            var ketKas = (kasData[k][4] || "").toString();
            var jenisLower = jenisKas.toLowerCase();
            var ketLower = ketKas.toLowerCase();

            if (kategoriKas === "Pengeluaran") {
              if (jenisLower.indexOf("setoran") === -1 && ketLower.indexOf("setoran") === -1 && jenisLower.indexOf("tutup kas") === -1) {
                res.pengeluaran_total += parseInt(kasData[k][6], 10) || 0;
              }
            } else if (kategoriKas === "Pemasukan") {
              if (jenisLower.indexOf("penjualan kasir") === -1 && ketLower.indexOf("penjualan kasir") === -1 && jenisLower.indexOf("saldo pindahan") === -1) {
                var nomMasuk = parseInt(kasData[k][5], 10) || 0;
                res.pemasukan_total += nomMasuk;
                res.ringkasan.pemasukan_lain += nomMasuk;

                res.riwayat_gabungan.push({
                  id: idKas,
                  tanggal: tglKasFmt,
                  sumber: "Di Luar Penjualan (Arus Kas)",
                  pelanggan: jenisKas,
                  rincian: ketKas || "-",
                  status: "Kas Masuk",
                  nominal: nomMasuk,
                  laba: 0
                });
              }
            }
          }
        }
      }
    }

    var validTrxIds = {};
    var sumTotalBelanja = 0;

    // 2. Cek Transaksi Penjualan Kasir
    if (sheetTrx) {
      var trxData = sheetTrx.getDataRange().getValues();
      for (var i = 1; i < trxData.length; i++) {
        if (trxData[i][0] !== "") {
          var d = parseDateSafe(trxData[i][1]);
          if (d >= startD && d <= endD) {
            var id = trxData[i][0].toString();
            var pel = trxData[i][4] ? trxData[i][4].toString() : "Umum";
            var metode = trxData[i][5] ? trxData[i][5].toString() : "Tunai";
            var statusRaw = trxData[i][6] ? trxData[i][6].toString() : "Lunas";
            var status = statusRaw.toLowerCase();
            var nom = parseInt(trxData[i][7], 10) || 0;
            var laba = parseInt(trxData[i][10], 10) || 0;
            var modal = nom - laba;

            var dFmt = Utilities.formatDate(d, "GMT+7", "dd/MM/yyyy");
            validTrxIds[id] = {
              dateStr: dFmt,
              pel: pel,
              metode: metode,
              status: statusRaw,
              nominal: nom,
              laba: laba,
              items: []
            };

            if (status === "lunas") {
              res.pemasukan_total += nom;
            }

            res.ringkasan.penjualan += nom;
            res.ringkasan.laba += laba;
            res.ringkasan.modal += modal;
            res.ringkasan.transaksi += 1;
            sumTotalBelanja += nom;

            if (!res.harian[dFmt]) {
              res.harian[dFmt] = { tanggal: dFmt, penjualan: 0, laba: 0, modal: 0, transaksi: 0, item: 0, diskon: 0 };
            }
            res.harian[dFmt].penjualan += nom;
            res.harian[dFmt].laba += laba;
            res.harian[dFmt].modal += modal;
            res.harian[dFmt].transaksi += 1;

            if (!res.pelanggan[pel]) {
              res.pelanggan[pel] = { nama: pel, penjualan: 0, laba: 0, transaksi: 0, item: 0 };
            }
            res.pelanggan[pel].penjualan += nom;
            res.pelanggan[pel].laba += laba;
            res.pelanggan[pel].transaksi += 1;
          }
        }
      }
    }

    var sumSubtotals = 0;
    if (sheetDetail) {
      var detData = sheetDetail.getDataRange().getValues();
      for (var j = 1; j < detData.length; j++) {
        var tid = detData[j][0] ? detData[j][0].toString() : "";
        if (validTrxIds[tid]) {
          var namaP = detData[j][2].toString();
          var qty = parseInt(detData[j][4], 10) || 0;
          var sub = parseInt(detData[j][5], 10) || 0;
          var labaP = parseInt(detData[j][7], 10) || 0;

          res.ringkasan.item += qty;
          sumSubtotals += sub;

          var tStr = validTrxIds[tid].dateStr;
          res.harian[tStr].item += qty;

          var pelStr = validTrxIds[tid].pel;
          res.pelanggan[pelStr].item += qty;

          validTrxIds[tid].items.push(namaP + " (" + qty + "x)");

          if (!res.produk[namaP]) {
            res.produk[namaP] = { nama: namaP, penjualan: 0, laba: 0, transaksi: 0, item: 0, trxs: [] };
          }
          res.produk[namaP].penjualan += sub;
          res.produk[namaP].laba += labaP;
          res.produk[namaP].item += qty;
          if (res.produk[namaP].trxs.indexOf(tid) === -1) {
            res.produk[namaP].trxs.push(tid);
            res.produk[namaP].transaksi += 1;
          }
        }
      }
    }

    // Gabungkan semua nota penjualan ke riwayat_gabungan
    Object.keys(validTrxIds).forEach(function (tid) {
      var info = validTrxIds[tid];
      res.riwayat_gabungan.push({
        id: tid,
        tanggal: info.dateStr,
        sumber: "Penjualan Kasir",
        pelanggan: info.pel,
        rincian: info.items.join(", ") || "Penjualan Barang",
        status: info.status + " (" + info.metode + ")",
        nominal: info.nominal,
        laba: info.laba
      });
    });

    res.ringkasan.diskon = sumSubtotals - sumTotalBelanja;
    if (res.ringkasan.diskon < 0) res.ringkasan.diskon = 0;

    var harianArr = Object.keys(res.harian).map(function(k) { return res.harian[k]; });
    var produkArr = Object.keys(res.produk).map(function(k) { return res.produk[k]; });
    var pelArr = Object.keys(res.pelanggan).map(function(k) { return res.pelanggan[k]; });

    harianArr.sort(function(a, b) { return parseTglSort(b.tanggal) - parseTglSort(a.tanggal); });
    produkArr.sort(function(a, b) { return b.penjualan - a.penjualan; });
    pelArr.sort(function(a, b) { return b.penjualan - a.penjualan; });
    res.riwayat_gabungan.sort(function(a, b) { return parseTglSort(b.tanggal) - parseTglSort(a.tanggal); });

    return {
      status: "sukses",
      data: {
        header: { pemasukan: res.pemasukan_total, pengeluaran: res.pengeluaran_total, neraca: res.ringkasan.laba },
        ringkasan: res.ringkasan,
        harian: harianArr,
        produk: produkArr,
        pelanggan: pelArr,
        riwayat_gabungan: res.riwayat_gabungan
      }
    };
  } catch (e) {
    return { status: "gagal", pesan: "Error Laporan: " + e.message };
  }
}

// ==========================================
// 10. LAPORAN STOK LENGKAP
// ==========================================
function getLaporanStokLengkap() {
  try {
    var ss = getSpreadsheet();
    var sheetMaster = ss.getSheetByName("Master Barang");
    var sheetMasuk = ss.getSheetByName("Barang Masuk");
    var sheetDetail = ss.getSheetByName("Detail Transaksi");

    var res = { total_nilai_aset: 0, total_item_stok: 0, daftar_stok: [], riwayat_pergerakan: [] };

    if (sheetMaster) {
      var masterData = sheetMaster.getDataRange().getValues();
      for (var i = 1; i < masterData.length; i++) {
        if (masterData[i][0] && masterData[i][0].toString().trim() !== "") {
          var idBarang = masterData[i][0].toString();
          var namaBarang = masterData[i][1].toString();
          var hargaModal = parseInt(masterData[i][3], 10) || 0;
          var hargaJual = parseInt(masterData[i][4], 10) || 0;
          var sisaStok = parseInt(masterData[i][9], 10) || 0;
          var nilaiAsetBarang = hargaModal * sisaStok;

          res.total_nilai_aset += nilaiAsetBarang;
          res.total_item_stok += sisaStok;

          res.daftar_stok.push({
            id: idBarang,
            nama: namaBarang,
            stok: sisaStok,
            modal: hargaModal,
            jual: hargaJual,
            aset: nilaiAsetBarang
          });
        }
      }
    }

    if (sheetMasuk) {
      var mskData = sheetMasuk.getDataRange().getValues();
      for (var m = 1; m < mskData.length; m++) {
        if (mskData[m][0] && mskData[m][0].toString().trim() !== "") {
          var idMsk = mskData[m][0].toString();
          var isOut = idMsk.indexOf("OUT-") === 0;
          res.riwayat_pergerakan.push({
            tanggal: formatTglAman(mskData[m][1]),
            jenis: isOut ? "Keluar" : "Masuk",
            nama: mskData[m][4].toString(),
            qty: parseInt(mskData[m][5], 10) || 0,
            keterangan: (isOut ? "Mutasi Keluar: " : "Restock: ") + (mskData[m][6] ? mskData[m][6].toString() : "-")
          });
        }
      }
    }

    if (sheetDetail) {
      var detData = sheetDetail.getDataRange().getValues();
      var trxMap = {};
      var sheetTrx = ss.getSheetByName("Transaksi");
      if (sheetTrx) {
        var trxRaw = sheetTrx.getDataRange().getValues();
        for (var t = 1; t < trxRaw.length; t++) {
          if (trxRaw[t][0] !== "") {
            trxMap[trxRaw[t][0].toString()] = formatTglAman(trxRaw[t][1]);
          }
        }
      }

      for (var j = 1; j < detData.length; j++) {
        if (detData[j][0] && detData[j][0].toString().trim() !== "") {
          var idTrx = detData[j][0].toString();
          var tglKeluar = trxMap[idTrx] || "Unknown";
          res.riwayat_pergerakan.push({
            tanggal: tglKeluar,
            jenis: "Keluar",
            nama: detData[j][2].toString(),
            qty: parseInt(detData[j][4], 10) || 0,
            keterangan: "Penjualan (Nota: " + idTrx + ")"
          });
        }
      }
    }

    res.daftar_stok.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
    res.riwayat_pergerakan.reverse();

    return { status: "sukses", data: res };
  } catch (e) {
    return { status: "gagal", pesan: "Error Laporan Stok: " + e.message };
  }
}

// ==========================================
// 11. LAPORAN PENGELUARAN LENGKAP (UPDATE POIN 2 & 3)
// ==========================================
function getLaporanPengeluaranLengkap(startDateStr, endDateStr) {
  try {
    var ss = getSpreadsheet();
    var sheetKas = ss.getSheetByName("Arus Kas");

    var startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
    var endD = new Date(endDateStr); endD.setHours(23, 59, 59, 999);

    var res = { total_pengeluaran: 0, harian: {}, kategori: {}, riwayat: [] };

    if (sheetKas) {
      var kasData = sheetKas.getDataRange().getValues();
      for (var k = 1; k < kasData.length; k++) {
        if (kasData[k][0] !== "") {
          var dKas = parseDateSafe(kasData[k][1]);
          if (dKas >= startD && dKas <= endD) {
            if (kasData[k][2] === "Pengeluaran") {
              var idKas = kasData[k][0].toString();
              var nominal = parseInt(kasData[k][6], 10) || 0;
              var jenis = kasData[k][3] ? kasData[k][3].toString() : "Lain-lain";
              var keterangan = kasData[k][4] ? kasData[k][4].toString() : "";

              var cekGabung = (jenis + " " + keterangan).toLowerCase();
              if (cekGabung.indexOf("setoran") === -1 && cekGabung.indexOf("tutup kas") === -1 && cekGabung.indexOf("pindah saldo") === -1) {
                var tglStr = Utilities.formatDate(dKas, "GMT+7", "dd/MM/yyyy");
                res.total_pengeluaran += nominal;

                if (!res.harian[tglStr]) res.harian[tglStr] = { tanggal: tglStr, nominal: 0, transaksi: 0 };
                res.harian[tglStr].nominal += nominal;
                res.harian[tglStr].transaksi += 1;

                if (!res.kategori[jenis]) res.kategori[jenis] = { nama: jenis, nominal: 0, transaksi: 0 };
                res.kategori[jenis].nominal += nominal;
                res.kategori[jenis].transaksi += 1;

                res.riwayat.push({
                  id: idKas,
                  tanggal: tglStr,
                  kategori: jenis,
                  keterangan: keterangan,
                  nominal: nominal
                });
              }
            }
          }
        }
      }
    }

    var harianArr = Object.keys(res.harian).map(function(k) { return res.harian[k]; });
    var katArr = Object.keys(res.kategori).map(function(k) { return res.kategori[k]; });

    harianArr.sort(function(a, b) { return parseTglSort(b.tanggal) - parseTglSort(a.tanggal); });
    katArr.sort(function(a, b) { return b.nominal - a.nominal; });
    res.riwayat.reverse();

    return {
      status: "sukses",
      data: {
        total: res.total_pengeluaran,
        harian: harianArr,
        kategori: katArr,
        riwayat: res.riwayat
      }
    };
  } catch (e) {
    return { status: "gagal", pesan: "Error Laporan Pengeluaran: " + e.message };
  }
}

// ==========================================
// 12. LAPORAN PIUTANG ADMIN (PERBAIKAN RUMUS SISA HUTANG & FILTER NGAMPAS)
// ==========================================
function getLaporanPiutangLengkap(startDateStr, endDateStr) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");

    var startD = new Date(startDateStr); startD.setHours(0, 0, 0, 0);
    var endD = new Date(endDateStr); endD.setHours(23, 59, 59, 999);

    var res = {
      sisa_piutang_global: 0,
      piutang_baru_periode: 0,
      pembayaran_periode: 0,
      pelanggan: {},
      riwayat_baru: [],
      riwayat_bayar: []
    };

    if (sheetTrx) {
      var trxData = sheetTrx.getDataRange().getValues();
      for (var i = 1; i < trxData.length; i++) {
        if (trxData[i][0] !== "") {
          var status = trxData[i][6] ? trxData[i][6].toString().trim() : "";
          var pel = trxData[i][4] ? trxData[i][4].toString().trim() : "Umum";
          var pelUpper = pel.toUpperCase();

          // Kecualikan NGAMPAS / KANVAS dari Piutang Reguler
          if (pelUpper.indexOf("NGAMPAS") !== -1 || pelUpper.indexOf("KANVAS") !== -1) {
            continue;
          }

          var totalBelanja = parseInt(trxData[i][7], 10) || 0;
          var sudahDibayar = parseInt(trxData[i][8], 10) || 0;
          var sisaHutang = totalBelanja - sudahDibayar; // Rumus Sisa Hutang Sebenarnya
          var tgl = parseDateSafe(trxData[i][1]);

          if (status === "Hutang" && sisaHutang > 0) {
            res.sisa_piutang_global += sisaHutang;
            if (!res.pelanggan[pel]) res.pelanggan[pel] = { nama: pel, nominal: 0, trx: 0 };
            res.pelanggan[pel].nominal += sisaHutang;
            res.pelanggan[pel].trx += 1;

            if (tgl >= startD && tgl <= endD) {
              res.piutang_baru_periode += sisaHutang;
              res.riwayat_baru.push({
                tanggal: Utilities.formatDate(tgl, "GMT+7", "dd/MM/yyyy"),
                id: trxData[i][0].toString(),
                pelanggan: pel,
                total: totalBelanja,
                dibayar: sudahDibayar,
                nominal: sisaHutang
              });
            }
          }
        }
      }
    }

    if (sheetKas) {
      var kasData = sheetKas.getDataRange().getValues();
      for (var k = 1; k < kasData.length; k++) {
        if (kasData[k][0] !== "") {
          var jenis = kasData[k][3] ? kasData[k][3].toString() : "";
          if (jenis === "Pelunasan Hutang") {
            var tglKas = parseDateSafe(kasData[k][1]);
            if (tglKas >= startD && tglKas <= endD) {
              var nomKas = parseInt(kasData[k][5], 10) || 0;
              res.pembayaran_periode += nomKas;
              res.riwayat_bayar.push({
                tanggal: Utilities.formatDate(tglKas, "GMT+7", "dd/MM/yyyy"),
                id: kasData[k][0].toString(),
                keterangan: kasData[k][4].toString(),
                nominal: nomKas
              });
            }
          }
        }
      }
    }

    var pelArr = Object.keys(res.pelanggan).map(function(k) { return res.pelanggan[k]; });
    pelArr.sort(function(a, b) { return b.nominal - a.nominal; });

    res.riwayat_baru.reverse();
    res.riwayat_bayar.reverse();

    return {
      status: "sukses",
      data: {
        global: res.sisa_piutang_global,
        baru: res.piutang_baru_periode,
        bayar: res.pembayaran_periode,
        pelanggan: pelArr,
        riwayat_baru: res.riwayat_baru,
        riwayat_bayar: res.riwayat_bayar
      }
    };
  } catch (e) {
    return { status: "gagal", pesan: "Error Laporan Piutang: " + e.message };
  }
}

// ==========================================
// 13. TAMBAH PRODUK BARU & MUTASI STOK BATCH
// ==========================================
function tambahProdukBaru(dataBarang) {
  try {
    var ss = getSpreadsheet();
    var sheetMaster = ss.getSheetByName("Master Barang");
    var sheetMasuk = ss.getSheetByName("Barang Masuk");

    var timestamp = new Date();
    var idBarang = "BRG-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
    var tanggal = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");

    var stokAwal = parseInt(dataBarang.stok, 10) || 0;
    var barisBaru = [
      idBarang,
      dataBarang.nama,
      dataBarang.kategori || "Umum",
      parseInt(dataBarang.modal, 10) || 0,
      parseInt(dataBarang.jual, 10) || 0,
      "Pcs",
      "",
      "",
      "",
      stokAwal
    ];
    sheetMaster.appendRow(barisBaru);

    if (stokAwal > 0 && sheetMasuk) {
      var idRestock = "IN-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
      sheetMasuk.appendRow([
        idRestock,
        tanggal,
        dataBarang.penerima || "Admin",
        idBarang,
        dataBarang.nama,
        stokAwal,
        "Stok Awal (Barang Baru)"
      ]);
    }

    return { status: "sukses", idBarang: idBarang, pesan: "Produk berhasil ditambahkan!" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function simpanMutasiBatch(paketData) {
  try {
    var ss = getSpreadsheet();
    var sheetMasuk = ss.getSheetByName("Barang Masuk");
    var sheetMaster = ss.getSheetByName("Master Barang");

    var timestamp = new Date();
    var prefix = paketData.jenisTrx === "Keluar" ? "OUT-" : "IN-";
    var baseId = prefix + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");

    var tanggal = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");
    if (paketData.tanggalCustom && paketData.tanggalCustom !== "") {
      var p = paketData.tanggalCustom.split("-");
      if (p.length === 3) tanggal = p[2] + "/" + p[1] + "/" + p[0];
    }

    var ketGlobal = paketData.jenisTrx === "Keluar"
      ? "[BARANG KELUAR] " + paketData.keteranganGlobal
      : paketData.keteranganGlobal;
    var pengali = paketData.jenisTrx === "Keluar" ? -1 : 1;

    var barisBaruMasuk = [];
    var items = paketData.daftarBarang || [];

    var masterData = sheetMaster.getDataRange().getValues();
    var masterStokBaru = [];
    for (var r = 0; r < masterData.length; r++) {
      masterStokBaru.push([masterData[r][9]]);
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var idRestockItem = baseId + "-" + (i + 1);
      var ketItem = item.infoSatuan ? (item.infoSatuan + " " + ketGlobal).trim() : ketGlobal;

      barisBaruMasuk.push([
        idRestockItem,
        tanggal,
        paketData.penerima,
        item.idBarang,
        item.namaBarang,
        parseInt(item.qtyPcs, 10) || 0,
        ketItem
      ]);

      for (var j = 1; j < masterData.length; j++) {
        if (masterData[j][0].toString() === item.idBarang.toString()) {
          var stokLama = parseInt(masterStokBaru[j][0], 10) || 0;
          masterStokBaru[j][0] = stokLama + ((parseInt(item.qtyPcs, 10) || 0) * pengali);
          break;
        }
      }
    }

    if (barisBaruMasuk.length > 0) {
      sheetMasuk
        .getRange(sheetMasuk.getLastRow() + 1, 1, barisBaruMasuk.length, barisBaruMasuk[0].length)
        .setValues(barisBaruMasuk);
    }

    sheetMaster.getRange(1, 10, masterStokBaru.length, 1).setValues(masterStokBaru);

    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function batalkanBarangMasuk(idRestock) {
  try {
    var ss = getSpreadsheet();
    var sheetMasuk = ss.getSheetByName("Barang Masuk");
    var sheetMaster = ss.getSheetByName("Master Barang");

    var pencari = sheetMasuk.createTextFinder(idRestock).matchEntireCell(false).findNext();
    if (pencari) {
      var baris = pencari.getRow();
      var dataBaris = sheetMasuk.getRange(baris, 1, 1, 7).getValues()[0];
      var rData = {
        tanggal: formatTglAman(dataBaris[1]),
        idBarang: dataBaris[3],
        qty: parseInt(dataBaris[5], 10) || 0,
        keterangan: dataBaris[6]
      };

      var pencariMaster = sheetMaster.createTextFinder(rData.idBarang).matchEntireCell(false).findNext();
      if (pencariMaster) {
        var barisMaster = pencariMaster.getRow();
        var stokLama = parseInt(sheetMaster.getRange(barisMaster, 10).getValue(), 10) || 0;
        var isKeluar = idRestock.toString().indexOf("OUT-") !== -1;
        var qtyRevert = isKeluar ? rData.qty : -rData.qty;
        sheetMaster.getRange(barisMaster, 10).setValue(stokLama + qtyRevert);
      }
      sheetMasuk.deleteRow(baris);
      return { status: "sukses", data: rData };
    } else {
      return { status: "gagal", pesan: "ID " + idRestock + " tidak ditemukan." };
    }
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 14. EDIT RIWAYAT (ARUS KAS & BARANG MASUK/KELUAR)
// ==========================================
function getDetailForEdit(id, jenis) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(jenis === "kas" ? "Arus Kas" : "Barang Masuk");
    var finder = sheet.createTextFinder(id).matchEntireCell(false).findNext();

    if (finder) {
      var row = finder.getRow();
      var data = sheet.getRange(row, 1, 1, 7).getValues()[0];
      var tglAman = formatTglAman(data[1]);

      var rData = {};
      if (jenis === "kas") {
        rData = {
          tanggal: tglAman,
          kategori: data[2],
          jenis: data[3],
          keterangan: data[4],
          nominal: data[2] === "Pemasukan" ? Number(data[5]) : Number(data[6])
        };
      } else {
        rData = {
          tanggal: tglAman,
          idBarang: data[3],
          namaBarang: data[4],
          qty: Number(data[5]),
          keterangan: data[6]
        };
      }
      return { status: "sukses", data: rData };
    } else {
      return { status: "gagal", pesan: "ID " + id + " tidak ditemukan!" };
    }
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function simpanUpdateEdit(id, jenis, dataLama, dataBaru) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(jenis === "kas" ? "Arus Kas" : "Barang Masuk");
    var finder = sheet.createTextFinder(id).matchEntireCell(false).findNext();
    if (!finder) return { status: "gagal", pesan: "Gagal menyimpan. ID tidak ditemukan." };
    var row = finder.getRow();

    if (jenis === "kas") {
      var nominalBaru = parseInt(dataBaru.nominal, 10) || 0;
      var masuk = dataBaru.kategori === "Pemasukan" ? nominalBaru : 0;
      var keluar = dataBaru.kategori === "Pengeluaran" ? nominalBaru : 0;
      sheet.getRange(row, 2, 1, 6).setValues([[dataBaru.tanggal, dataBaru.kategori, dataBaru.jenis, dataBaru.keterangan, masuk, keluar]]);
    } else if (jenis === "restock") {
      var qtyBaru = parseInt(dataBaru.qty, 10) || 0;
      sheet.getRange(row, 2).setValue(dataBaru.tanggal);
      sheet.getRange(row, 6).setValue(qtyBaru);
      sheet.getRange(row, 7).setValue(dataBaru.keterangan);

      var isKeluar = id.toString().indexOf("OUT-") !== -1;
      var pengali = isKeluar ? -1 : 1;

      var qtyLamaReal = (parseInt(dataLama.qty, 10) || 0) * pengali;
      var qtyBaruReal = qtyBaru * pengali;
      var deltaQty = qtyBaruReal - qtyLamaReal;

      if (deltaQty !== 0) {
        var sheetMaster = ss.getSheetByName("Master Barang");
        var finderMaster = sheetMaster.createTextFinder(dataLama.idBarang).matchEntireCell(false).findNext();
        if (finderMaster) {
          var rowM = finderMaster.getRow();
          var stokLama = parseInt(sheetMaster.getRange(rowM, 10).getValue(), 10) || 0;
          sheetMaster.getRange(rowM, 10).setValue(stokLama + deltaQty);
        }
      }
    }
    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 15. PENGATURAN TOKO & STRUK
// ==========================================
function getPengaturanToko() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Pengaturan");

    if (!sheet) {
      sheet = ss.insertSheet("Pengaturan");
      sheet.appendRow(["Kunci", "Nilai"]);
      sheet.appendRow(["nama_toko", "AL-KAUTSAR FILTER AIR"]);
      sheet.appendRow(["alamat_toko", "Jl. Ahmad Yani, Bulukarto, Sidoharjo, Kab. Pringsewu, Lampung 35372"]);
      sheet.appendRow(["kontak_toko", "0813-7961-2518 (Ibu Veramon) / 0812-7964-5858 (Pak Jon)"]);
      sheet.appendRow(["footer_struk", "Terimakasih atas pesanan anda.\nHubungi nomor di atas untuk pemesanan selanjutnya!"]);
      sheet.appendRow(["logo_url", ""]);
    }

    var data = sheet.getDataRange().getValues();
    var setting = {};
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "") {
        setting[data[i][0]] = data[i][1];
      }
    }
    return { status: "sukses", data: setting };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function simpanPengaturanToko(settingBaru) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Pengaturan");
    if (!sheet) return { status: "gagal", pesan: "Sheet Pengaturan tidak ditemukan." };

    var keys = ["nama_toko", "alamat_toko", "kontak_toko", "footer_struk", "logo_url"];
    var data = sheet.getDataRange().getValues();

    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var found = false;
      for (var j = 1; j < data.length; j++) {
        if (data[j][0] == k) {
          sheet.getRange(j + 1, 2).setValue(settingBaru[k] || "");
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([k, settingBaru[k] || ""]);
      }
    }
    return { status: "sukses", pesan: "Pengaturan Struk berhasil diperbarui!" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 16. FITUR NGAMPAS (KANVAS) TERINTEGRASI (PERBAIKAN POIN 8)
// ==========================================
function getDaftarNgampasTerintegrasi() {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    if (!sheetTrx) return { status: "gagal", pesan: "Sheet 'Transaksi' tidak ditemukan." };

    var data = sheetTrx.getDataRange().getValues();
    var header = data[0];

    var colId = header.findIndex(function(h) { return h.toString().toLowerCase().indexOf("id transaksi") !== -1; });
    var colTgl = header.findIndex(function(h) { return h.toString().toLowerCase().indexOf("tanggal") !== -1; });
    var colPel = header.findIndex(function(h) { return h.toString().toLowerCase().indexOf("nama pelanggan") !== -1; });
    var colStat = header.findIndex(function(h) { return h.toString().toLowerCase().indexOf("status") !== -1; });
    var colTotal = header.findIndex(function(h) { return h.toString().toLowerCase().indexOf("total belanja") !== -1; });

    if (colId === -1) colId = 0;
    if (colTgl === -1) colTgl = 1;
    if (colPel === -1) colPel = 4;
    if (colStat === -1) colStat = 6;
    if (colTotal === -1) colTotal = 7;

    var result = [];
    for (var i = data.length - 1; i >= 1; i--) {
      var statusRaw = data[i][colStat] ? data[i][colStat].toString().toUpperCase().trim() : "";
      var pelangganRaw = data[i][colPel] ? data[i][colPel].toString().toUpperCase().trim() : "";

      if (statusRaw === "HUTANG" && (pelangganRaw.indexOf("NGAMPAS") !== -1 || pelangganRaw.indexOf("KANVAS") !== -1)) {
        var tglStr = formatTglAman(data[i][colTgl]);
        var totalBawa = parseInt(data[i][colTotal], 10) || 0;
        result.push({
          id: data[i][colId].toString(),
          tanggal: tglStr,
          supir: data[i][colPel].toString(),
          total: totalBawa,
          bawaan: "Total Bawa: Rp " + totalBawa.toLocaleString("id-ID")
        });
      }
    }
    return { status: "sukses", data: result };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

function selesaikanNgampasTerintegrasi(idTrx, dataRetur, setoranAktual, diskonMurni, metodeSetoran) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetDet = ss.getSheetByName("Detail Transaksi");
    var sheetMas = ss.getSheetByName("Master Barang");
    var sheetKas = ss.getSheetByName("Arus Kas");

    var detData = sheetDet.getDataRange().getValues();
    var masData = sheetMas.getDataRange().getValues();

    // Buat kamus harga modal satuan dari Master Barang
    var kamusModal = {};
    for (var km = 1; km < masData.length; km++) {
      if (masData[km][0] !== "") {
        kamusModal[masData[km][0].toString()] = parseInt(masData[km][3], 10) || 0;
      }
    }

    var totalBelanjaBaru = 0;
    var totalModalBaru = 0;

    for (var d = detData.length - 1; d >= 1; d--) {
      if (detData[d][0] && detData[d][0].toString() === idTrx) {
        var idBrg = detData[d][1].toString();
        var qtyAwal = parseInt(detData[d][4], 10) || 0;
        var hargaJual = parseInt(detData[d][3], 10) || 0;
        var modalLamaBaris = parseInt(detData[d][6], 10) || 0;

        var qtyRetur = 0;
        for (var r = 0; r < dataRetur.length; r++) {
          if (dataRetur[r].idBarang.toString() === idBrg) {
            qtyRetur = parseInt(dataRetur[r].qtyRetur, 10) || 0;
            break;
          }
        }

        // Kembalikan stok barang yang diretur ke Master Barang
        if (qtyRetur > 0) {
          for (var m = 1; m < masData.length; m++) {
            if (masData[m][0] && masData[m][0].toString() === idBrg) {
              var stokLama = parseInt(sheetMas.getRange(m + 1, 10).getValue(), 10) || 0;
              sheetMas.getRange(m + 1, 10).setValue(stokLama + qtyRetur);
              break;
            }
          }
        }

        // Hitung ulang Qty, Subtotal, Modal, dan Laba di Detail Transaksi
        var qtyAkhir = qtyAwal - qtyRetur;
        if (qtyAkhir <= 0) {
          sheetDet.deleteRow(d + 1);
        } else {
          var subtotalBaru = qtyAkhir * hargaJual;
          var modalSatuan = kamusModal[idBrg] !== undefined
            ? kamusModal[idBrg]
            : (qtyAwal > 0 ? Math.round(modalLamaBaris / qtyAwal) : 0);
          var modalItemBaru = qtyAkhir * modalSatuan;
          var labaItemBaru = subtotalBaru - modalItemBaru;

          // Update Kolom E (Qty), F (Subtotal), G (Total Modal), H (Laba)
          sheetDet.getRange(d + 1, 5, 1, 4).setValues([[qtyAkhir, subtotalBaru, modalItemBaru, labaItemBaru]]);

          totalBelanjaBaru += subtotalBaru;
          totalModalBaru += modalItemBaru;
        }
      }
    }

    diskonMurni = parseInt(diskonMurni, 10) || 0;
    setoranAktual = parseInt(setoranAktual, 10) || 0;
    var totalSetelahDiskon = totalBelanjaBaru - diskonMurni;
    if (totalSetelahDiskon < 0) totalSetelahDiskon = 0;

    // Laba bersih nota setelah dikurangi retur dan diskon selisih
    var labaBersihNota = totalSetelahDiskon - totalModalBaru;

    var trxData = sheetTrx.getDataRange().getValues();
    var namaSupir = "NGAMPAS";

    for (var t = 1; t < trxData.length; t++) {
      if (trxData[t][0] && trxData[t][0].toString() === idTrx) {
        namaSupir = trxData[t][4] ? trxData[t][4].toString() : "NGAMPAS";
        // Update Kolom G (Status = Dilunasi), H (Total Belanja), I (Bayar), J (Kembalian = 0), K (Laba Bersih)
        sheetTrx.getRange(t + 1, 7, 1, 5).setValues([["Dilunasi", totalSetelahDiskon, setoranAktual, 0, labaBersihNota]]);
        break;
      }
    }

    // Catat uang setoran aktual ke sheet Arus Kas pada tanggal pelunasan
    if (setoranAktual > 0 && sheetKas) {
      var timestamp = new Date();
      var idKas = "KAS-" + Utilities.formatDate(timestamp, "GMT+7", "yyMMddHHmmss");
      var tanggalPelunasan = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy");
      var metode = metodeSetoran || "Tunai";

      sheetKas.appendRow([
        idKas,
        tanggalPelunasan,
        "Pemasukan",
        "Pelunasan Ngampas",
        "Setoran " + namaSupir + " - Nota: " + idTrx + " (Via " + metode + ")",
        setoranAktual,
        0,
        ""
      ]);

      var metodeLower = metode.toLowerCase();
      if (metodeLower === "transfer" || metodeLower === "qris") {
        var idKasAuto = idKas + "-AUT";
        sheetKas.appendRow([
          idKasAuto,
          tanggalPelunasan,
          "Pengeluaran",
          "Setoran",
          "Auto-Setor (" + metode + ") Ngampas - Nota: " + idTrx,
          0,
          setoranAktual,
          ""
        ]);
      }
    }

    return { status: "sukses" };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 17. MENU PIUTANG KASIR (KECUALIKAN NOTA NGAMPAS - POIN 9)
// ==========================================
function getDaftarPiutangAktif() {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    if (!sheetTrx) throw new Error("Sheet Transaksi tidak ditemukan");

    var data = sheetTrx.getDataRange().getValues();
    var piutang = [];

    for (var i = 1; i < data.length; i++) {
      var idTrx = data[i][0] ? data[i][0].toString().trim() : "";
      var status = data[i][6] ? data[i][6].toString().trim() : "";
      var pelanggan = data[i][4] ? data[i][4].toString().trim() : "Umum";
      var pelUpper = pelanggan.toUpperCase();

      // Kecualikan nota NGAMPAS / KANVAS dari daftar Piutang reguler
      if (pelUpper.indexOf("NGAMPAS") !== -1 || pelUpper.indexOf("KANVAS") !== -1) {
        continue;
      }

      if (idTrx !== "" && status === "Hutang") {
        var totalTagihan = parseInt(data[i][7], 10) || 0;
        var sudahDibayar = parseInt(data[i][8], 10) || 0;
        var sisaHutang = totalTagihan - sudahDibayar;

        if (sisaHutang > 0) {
          piutang.push({
            id: idTrx,
            tanggal: formatTglAman(data[i][1]),
            pelanggan: pelanggan,
            total: totalTagihan,
            dibayar: sudahDibayar,
            sisa: sisaHutang
          });
        }
      }
    }

    piutang.reverse();
    return { status: "sukses", data: piutang };
  } catch (e) {
    return { status: "gagal", pesan: e.message };
  }
}

// ==========================================
// 18. SALDO AWAL & TUTUP KAS (OTOMATIS / MANUAL / MASA LALU)
// ==========================================
function getSaldoAwal(targetDateStr) {
  try {
    var ss = getSpreadsheet();
    var sheetTrx = ss.getSheetByName("Transaksi");
    var sheetKas = ss.getSheetByName("Arus Kas");

    var targetD = new Date(targetDateStr);
    targetD.setHours(0, 0, 0, 0);

    var saldoTotal = 0;

    if (sheetTrx) {
      var trxData = sheetTrx.getDataRange().getValues();
      for (var i = 1; i < trxData.length; i++) {
        if (trxData[i][0] !== "") {
          var d = parseDateSafe(trxData[i][1]);
          var status = (trxData[i][6] || "").toString().toLowerCase();
          if (d < targetD && status === "lunas") {
            saldoTotal += parseInt(trxData[i][7], 10) || 0;
          }
        }
      }
    }

    if (sheetKas) {
      var kasData = sheetKas.getDataRange().getValues();
      for (var k = 1; k < kasData.length; k++) {
        if (kasData[k][0] !== "") {
          var dKas = parseDateSafe(kasData[k][1]);
          if (dKas < targetD) {
            var kategoriKas = kasData[k][2];
            var jenis = (kasData[k][3] || "").toString().toLowerCase();
            var ket = (kasData[k][4] || "").toString().toLowerCase();
            if (kategoriKas === "Pemasukan") {
              if (jenis.indexOf("penjualan kasir") === -1 && ket.indexOf("penjualan kasir") === -1) {
                saldoTotal += parseInt(kasData[k][5], 10) || 0;
              }
            } else if (kategoriKas === "Pengeluaran") {
              saldoTotal -= parseInt(kasData[k][6], 10) || 0;
            }
          }
        }
      }
    }

    return { status: "sukses", data: saldoTotal };
  } catch (e) {
    return { status: "gagal", pesan: "Error Saldo Awal: " + e.message };
  }
}

function otomatisasiSaldoPindahan() {
  var ss = getSpreadsheet();
  var sheetKas = ss.getSheetByName("Arus Kas");
  var sheetTrx = ss.getSheetByName("Transaksi");
  if (!sheetKas || !sheetTrx) return;

  var kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  var tglKemarinFmt = Utilities.formatDate(kemarin, "GMT+7", "dd/MM/yyyy");

  var totalMasuk = 0;
  var totalKeluar = 0;

  var trxData = sheetTrx.getDataRange().getValues();
  for (var i = 1; i < trxData.length; i++) {
    if (trxData[i][0] !== "") {
      var dTrx = formatTglAman(trxData[i][1]);
      var status = (trxData[i][6] || "").toString().toLowerCase();
      if (dTrx === tglKemarinFmt && status === "lunas") {
        totalMasuk += parseInt(trxData[i][7], 10) || 0;
      }
    }
  }

  var kasData = sheetKas.getDataRange().getValues();
  for (var j = 1; j < kasData.length; j++) {
    if (kasData[j][0] !== "") {
      var dKas = formatTglAman(kasData[j][1]);
      if (dKas === tglKemarinFmt) {
        var kategori = kasData[j][2];
        var jenis = (kasData[j][3] || "").toString().toLowerCase();
        var ket = (kasData[j][4] || "").toString().toLowerCase();

        if (kategori === "Pemasukan") {
          if (jenis.indexOf("penjualan kasir") === -1 && ket.indexOf("penjualan kasir") === -1) {
            totalMasuk += parseInt(kasData[j][5], 10) || 0;
          }
        } else if (kategori === "Pengeluaran") {
          totalKeluar += parseInt(kasData[j][6], 10) || 0;
        }
      }
    }
  }

  var sisa = totalMasuk - totalKeluar;
  if (sisa > 0) {
    var hariIni = new Date();
    var tglHariIniFmt = Utilities.formatDate(hariIni, "GMT+7", "dd/MM/yyyy");

    sheetKas.appendRow(["TTP-" + kemarin.getTime(), tglKemarinFmt, "Pengeluaran", "Tutup Kas", "Pindah saldo laci ke besok", 0, sisa, ""]);
    sheetKas.appendRow(["SLD-" + hariIni.getTime(), tglHariIniFmt, "Pemasukan", "Saldo Pindahan", "Sisa Kas Otomatis", sisa, 0, ""]);
  }
}

function tutupKasManualSistem() {
  var ss = getSpreadsheet();
  var sheetKas = ss.getSheetByName("Arus Kas");
  var sheetTrx = ss.getSheetByName("Transaksi");
  if (!sheetKas || !sheetTrx) return { status: "gagal", pesan: "Database tidak ditemukan." };

  var hariIni = new Date();
  var tglHariIniFmt = Utilities.formatDate(hariIni, "GMT+7", "dd/MM/yyyy");
  var totalMasuk = 0;
  var totalKeluar = 0;

  var trxData = sheetTrx.getDataRange().getValues();
  for (var i = 1; i < trxData.length; i++) {
    if (trxData[i][0] !== "") {
      var dTrx = formatTglAman(trxData[i][1]);
      var status = (trxData[i][6] || "").toString().toLowerCase();
      if (dTrx === tglHariIniFmt && status === "lunas") {
        totalMasuk += parseInt(trxData[i][7], 10) || 0;
      }
    }
  }

  var kasData = sheetKas.getDataRange().getValues();
  for (var j = 1; j < kasData.length; j++) {
    if (kasData[j][0] !== "") {
      var dKas = formatTglAman(kasData[j][1]);
      if (dKas === tglHariIniFmt) {
        var kategori = kasData[j][2];
        var jenis = (kasData[j][3] || "").toString().toLowerCase();
        var ket = (kasData[j][4] || "").toString().toLowerCase();

        if (kategori === "Pemasukan") {
          if (jenis.indexOf("penjualan kasir") === -1 && ket.indexOf("penjualan kasir") === -1) {
            totalMasuk += parseInt(kasData[j][5], 10) || 0;
          }
        } else if (kategori === "Pengeluaran") {
          totalKeluar += parseInt(kasData[j][6], 10) || 0;
        }
      }
    }
  }

  var sisa = totalMasuk - totalKeluar;
  if (sisa > 0) {
    var waktuTutup = new Date();
    var besok = new Date();
    besok.setDate(besok.getDate() + 1);
    var tglBesokFmt = Utilities.formatDate(besok, "GMT+7", "dd/MM/yyyy");

    sheetKas.appendRow(["TTPM-" + waktuTutup.getTime(), tglHariIniFmt, "Pengeluaran", "Tutup Kas", "Tutup Kas Manual", 0, sisa, ""]);
    sheetKas.appendRow(["SLDM-" + besok.getTime(), tglBesokFmt, "Pemasukan", "Saldo Pindahan", "Saldo Pindahan Manual", sisa, 0, ""]);
    return { status: "sukses", pesan: "SUKSES!\n\nUang Rp " + sisa.toLocaleString("id-ID") + " telah dipindahkan ke besok (" + tglBesokFmt + ")." };
  } else {
    return { status: "gagal", pesan: "Laci saat ini sudah kosong (Rp 0)." };
  }
}

function tutupKasMasaLaluSistem(tanggalStr) {
  var ss = getSpreadsheet();
  var sheetKas = ss.getSheetByName("Arus Kas");
  var sheetTrx = ss.getSheetByName("Transaksi");
  if (!sheetKas || !sheetTrx) return { status: "gagal", pesan: "Database error." };

  var totalMasuk = 0;
  var totalKeluar = 0;
  var sudahTutup = false;

  var trxData = sheetTrx.getDataRange().getValues();
  for (var i = 1; i < trxData.length; i++) {
    if (trxData[i][0] !== "") {
      var dTrx = formatTglAman(trxData[i][1]);
      var status = (trxData[i][6] || "").toString().toLowerCase();
      if (dTrx === tanggalStr && status === "lunas") {
        totalMasuk += parseInt(trxData[i][7], 10) || 0;
      }
    }
  }

  var kasData = sheetKas.getDataRange().getValues();
  for (var j = 1; j < kasData.length; j++) {
    if (kasData[j][0] !== "") {
      var dKas = formatTglAman(kasData[j][1]);
      if (dKas === tanggalStr) {
        var kategori = kasData[j][2];
        var jenis = (kasData[j][3] || "").toString().toLowerCase();
        var ket = (kasData[j][4] || "").toString().toLowerCase();

        if (jenis.indexOf("tutup kas") !== -1 || ket.indexOf("tutup kas") !== -1) sudahTutup = true;

        if (kategori === "Pemasukan") {
          if (jenis.indexOf("penjualan kasir") === -1 && ket.indexOf("penjualan kasir") === -1) {
            totalMasuk += parseInt(kasData[j][5], 10) || 0;
          }
        } else if (kategori === "Pengeluaran") {
          totalKeluar += parseInt(kasData[j][6], 10) || 0;
        }
      }
    }
  }

  if (sudahTutup) {
    return { status: "gagal", pesan: "Tutup Kas untuk tanggal " + tanggalStr + " sudah pernah dilakukan!" };
  }

  var sisa = totalMasuk - totalKeluar;
  if (sisa > 0) {
    var p = tanggalStr.split("/");
    var waktuTutup = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10), 23, 59, 59);
    var besok = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    besok.setDate(besok.getDate() + 1);
    var tglBesokFmt = Utilities.formatDate(besok, "GMT+7", "dd/MM/yyyy");

    sheetKas.appendRow(["TTPP-" + waktuTutup.getTime(), tanggalStr, "Pengeluaran", "Tutup Kas", "Tutup Kas Manual (Masa Lalu)", 0, sisa, ""]);
    sheetKas.appendRow(["SLDP-" + besok.getTime(), tglBesokFmt, "Pemasukan", "Saldo Pindahan", "Saldo Pindahan (Masa Lalu)", sisa, 0, ""]);

    return { status: "sukses", pesan: "SUKSES!\n\nUang Rp " + sisa.toLocaleString("id-ID") + " dari tanggal " + tanggalStr + " berhasil ditutup dan dipindahkan ke " + tglBesokFmt + "." };
  } else {
    return { status: "gagal", pesan: "Sisa kas di tanggal " + tanggalStr + " adalah Rp 0." };
  }
}