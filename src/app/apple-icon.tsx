import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the brand tile with a white A, drawn at build time. */
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
          background: "#2350C8",
          color: "#FFFFFF",
          fontSize: 118,
          fontFamily: "Georgia, serif",
          fontWeight: 600,
        }}
      >
        A
      </div>
    ),
    size,
  );
}
