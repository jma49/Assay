import { ImageResponse } from "next/og";
import { markTileSvg } from "@/lib/brand/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the Row A mark on a square night tile; iOS rounds the corners itself. */
export default function AppleIcon() {
  const svg = markTileSvg(180);
  return new ImageResponse(
    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={180} height={180} alt="" />,
    size,
  );
}
