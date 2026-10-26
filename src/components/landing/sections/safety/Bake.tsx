/** A baked layer of the stage: the portrait bake below 1180 px, the landscape bake above (public/landing/safety/). */
interface Art {
  src: string;
  width: number;
  height: number;
}

const PHONE = "(max-width: 1179px)";

export function Bake({ phone, desk, className }: { phone: Art; desk: Art; className?: string }) {
  // a one-light bake registered on the stage by percentages (light in its alpha): served as baked, no optimiser
  return (
    <picture className={className}>
      <source media={PHONE} srcSet={phone.src} width={phone.width} height={phone.height} />
      <img src={desk.src} alt="" width={desk.width} height={desk.height} loading="lazy" decoding="async" />
    </picture>
  );
}

const dir = "/landing/safety";
export const ART = {
  plates: { phone: { src: `${dir}/plates-p.webp`, width: 880, height: 2480 }, desk: { src: `${dir}/plates-d.webp`, width: 2560, height: 1440 } },
  glint: { phone: { src: `${dir}/glint-p.webp`, width: 880, height: 1700 }, desk: { src: `${dir}/glint-d.webp`, width: 1500, height: 1440 } },
  beam: { phone: { src: `${dir}/beam-p.webp`, width: 420, height: 900 }, desk: { src: `${dir}/beam-d.webp`, width: 1280, height: 580 } },
  cut: { phone: { src: `${dir}/cut-p.webp`, width: 400, height: 200 }, desk: { src: `${dir}/cut-d.webp`, width: 280, height: 400 } },
} satisfies Record<string, { phone: Art; desk: Art }>;
