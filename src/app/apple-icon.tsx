import { ImageResponse } from "next/og";
import { markSvg } from "@/lib/brand/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the Row A mark on a square tile; iOS rounds the corners itself. */
export default function AppleIcon() {
  const svg = markSvg({ size: 180, rounded: false });
  return new ImageResponse(
    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={180} height={180} alt="" />,
    size,
  );
}
