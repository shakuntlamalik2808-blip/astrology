import { useWebsiteSettings } from "@/lib/website-settings";
import { Reveal } from "./Reveal";

function getVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith("youtu.be")) return parsed.pathname.slice(1).split("/")[0];
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => part === "shorts" || part === "embed");
    return marker >= 0 ? parts[marker + 1] : null;
  } catch {
    return null;
  }
}

export function Shorts() {
  const settings = useWebsiteSettings();
  const shorts = settings.shorts.flatMap((short) => {
    const videoId = getVideoId(short.url);
    return videoId ? [{ ...short, videoId }] : [];
  });

  return (
    <section id="shorts" className="surface-night section-rule editorial-section">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-12">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow text-gold">From YouTube</p>
              <h2 className="display mt-4 text-[clamp(2.2rem,4vw,3.5rem)] text-ivory">Astrology in a moment.</h2>
            </div>
            <a className="text-sm text-gold underline-offset-4 hover:underline" href="https://www.youtube.com/@starsandsutra/shorts" target="_blank" rel="noreferrer">View all Shorts ↗</a>
          </div>
        </Reveal>
        {shorts.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shorts.map((short, index) => (
              <Reveal key={short.id} delay={index * 0.06}>
                <article className="overflow-hidden rounded-sm border border-ivory/15 bg-black/20">
                  <div className="aspect-[9/16]">
                    <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${short.videoId}`} title={short.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                  </div>
                  <h3 className="p-4 text-sm text-ivory">{short.title}</h3>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-sm border border-ivory/15 bg-black/20 px-6 py-10 text-center">
            <p className="text-sm leading-relaxed text-ivory/70">Our latest astrology videos and short insights are on YouTube.</p>
            <a className="mt-4 inline-flex text-sm text-gold underline-offset-4 hover:underline" href="https://www.youtube.com/@starsandsutra/shorts" target="_blank" rel="noreferrer">Watch the Shorts ↗</a>
          </div>
        )}
      </div>
    </section>
  );
}
