import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/config/site.config";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1b67da 0%, #0a2a6b 60%, #050507 100%)",
          color: "#ffffff",
          fontSize: 110,
          fontWeight: 800,
        }}
      >
        {BRAND_NAME.charAt(0).toUpperCase()}
      </div>
    ),
    size,
  );
}
