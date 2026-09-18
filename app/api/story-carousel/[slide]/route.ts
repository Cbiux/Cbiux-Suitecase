import { renderStorySlide, STORY_SLIDES } from "@/lib/story-carousel";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slide: string }> },
) {
  const id = Number((await context.params).slide);
  const slide = STORY_SLIDES.find((item) => item.id === id);
  if (!slide) {
    return new Response("Not found", { status: 404 });
  }
  const image = await renderStorySlide(id);
  const body = await image.arrayBuffer();
  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${slide.file}"`,
      "Cache-Control": "no-store",
    },
  });
}
