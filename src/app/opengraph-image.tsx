import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Vendro — porudžbine za veleprodaju, bez poziva";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/vendro-logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F6F4",
          padding: "72px",
        }}
      >
        <img src={src} alt="" width={296} height={88} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, color: "#111111", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            Porudžbine, bez poziva.
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#6B6B6B", lineHeight: 1.4 }}>
            Kupci naručuju online. Svaka porudžbina stiže na jedno mesto.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
