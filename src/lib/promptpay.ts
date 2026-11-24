// สร้าง payload PromptPay QR (EMVCo) แบบระบุยอดเงิน

const f = (id: string, v: string) => id + v.length.toString().padStart(2, "0") + v;

function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function promptpayPayload(id: string, amountSatang: number) {
  const digits = id.replace(/\D/g, "");
  const target = digits.length >= 13
    ? f("02", digits) // เลขบัตรประชาชน / เลขผู้เสียภาษี
    : f("01", ("0000000000000" + "66" + digits.replace(/^0/, "")).slice(-13)); // เบอร์มือถือ
  const body =
    f("00", "01") + f("01", "12") +
    f("29", f("00", "A000000677010111") + target) +
    f("53", "764") + f("54", (amountSatang / 100).toFixed(2)) + f("58", "TH") + "6304";
  return body + crc16(body);
}
