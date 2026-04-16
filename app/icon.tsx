import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#3d2b1f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          {/* Rangée du haut */}
          <polygon points="11,2 16,9 11,7" fill="#e8d5b0" />
          <polygon points="11,2 6,9 11,7" fill="#c8b49a" />
          {/* Ceinture */}
          <polygon points="6,9 11,7 11,9" fill="#d4c4a0" />
          <polygon points="16,9 11,7 11,9" fill="#b8a080" />
          {/* Pavillon */}
          <polygon points="6,9 11,9 8,15" fill="#c0583a" />
          <polygon points="16,9 11,9 14,15" fill="#8b3a22" />
          <polygon points="8,15 11,9 14,15 11,20" fill="#d4693a" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
