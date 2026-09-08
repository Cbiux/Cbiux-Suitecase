import { saveOffer } from "@/lib/store";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brand?: string;
      email?: string;
      proposal?: string;
      note?: string;
    };
    const brand = body.brand?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const proposal = body.proposal?.trim() ?? "";
    const note = body.note?.trim() ?? "";

    if (!brand || !email || !proposal) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (brand.length > 80 || email.length > 120 || proposal.length > 400 || note.length > 1000) {
      return Response.json({ error: "TOO_LONG" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    const offer = await saveOffer({ brand, email, proposal, note });
    return Response.json({ ok: true, id: offer.id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "OFFER_FAILED";
    return Response.json({ error: code }, { status: 400 });
  }
}
