export interface PersonName {
  fullName: string;
  shortName: string;
}

export interface ImageAsset {
  src: string;
  alt: string;
}

export interface SiteConfig {
  groom: PersonName;
  bride: PersonName;
  dateText: string;
  lunarText: string;
  timeText: string;
  /** Absolute event instant (Asia/Ho_Chi_Minh, UTC+7) used by the countdown. */
  eventAt: string;
  venue: {
    name: string;
    address: string;
    mapsUrl: string;
  };
  cover: ImageAsset;
  qr: ImageAsset & {
    accountHolder: string;
    bankName: string;
  };
}

// Placeholder venue address; replace with the real one before launch.
const venueAddress = "123 Đường ABC, Phường XYZ, TP. Hồ Chí Minh";

export const siteConfig: SiteConfig = {
  groom: { fullName: "Nguyễn Minh Phi", shortName: "Minh Phi" },
  bride: { fullName: "Trần Thị Mỹ Ngân", shortName: "Mỹ Ngân" },
  dateText: "Chủ nhật, 17.01.2027",
  lunarText: "Nhằm ngày 10 tháng Chạp năm Bính Ngọ",
  timeText: "14:00",
  eventAt: "2027-01-17T14:00:00+07:00",
  venue: {
    name: "Nhà hàng A",
    address: venueAddress,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`,
  },
  cover: {
    src: "/cover.jpg",
    alt: "Ảnh cưới của Minh Phi và Mỹ Ngân",
  },
  qr: {
    src: "/qr.png",
    alt: "Mã QR chuyển khoản mừng cưới",
    accountHolder: "NGUYEN MINH PHI",
    bankName: "Ngân hàng (cập nhật sau)",
  },
};
