import { ImageResponse } from "next/og";
import { beetleIconSvg } from "@/lib/brand/beetle";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the pixel beetle on the pale brand tile, drawn at build time. */
export default function AppleIcon() {
  const svg = beetleIconSvg({ size: 180, tile: null });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#EAF0FD" }}>
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={156} height={156} alt="" />
      </div>
    ),
    size,
  );
}
