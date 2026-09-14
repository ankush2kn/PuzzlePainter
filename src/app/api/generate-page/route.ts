import { NextResponse } from "next/server";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/constants";
import { sanitizeSvg } from "@/lib/templates";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You create simple black-and-white coloring book pages for children ages 6-10 (especially girls).

Rules:
- Return ONLY a single valid SVG element. No markdown, no explanation.
- Root element: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
- Use fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" on shapes (or inherit from group).
- Draw cute, bold outlines with CLOSED shapes so kids can paint-bucket fill regions.
- Keep it simple: one main subject, a few fun extras (stars, hearts, sparkles), portrait letter layout.
- No text labels, no foreignObject, no scripts, no images, no external URLs.
- Friendly, whimsical, not scary.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenRouter API key missing. Add OPENROUTER_API_KEY to .env.local",
      },
      { status: 500 },
    );
  }

  let prompt: string;
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("prompt" in body) ||
      typeof (body as { prompt: unknown }).prompt !== "string"
    ) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }
    prompt = (body as { prompt: string }).prompt.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (prompt.length < 3) {
    return NextResponse.json(
      { error: "Tell me a little more about your page!" },
      { status: 400 },
    );
  }
  if (prompt.length > 500) {
    return NextResponse.json(
      { error: "That description is a bit long — try a shorter one!" },
      { status: 400 },
    );
  }

  const model =
    process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
          "X-Title": "Puzzle Painter",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Create a coloring page SVG of: ${prompt}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenRouter error", response.status, detail);
      return NextResponse.json(
        { error: "Could not reach the art helper. Try again in a moment." },
        { status: 502 },
      );
    }

    const data: unknown = await response.json();
    const content = extractContent(data);
    if (!content) {
      return NextResponse.json(
        { error: "The art helper returned an empty page. Try again!" },
        { status: 502 },
      );
    }

    const svg = sanitizeSvg(content);
    if (!svg) {
      return NextResponse.json(
        {
          error:
            "Couldn't read that drawing. Try a simpler description!",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ svg, model });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong making your page." },
      { status: 500 },
    );
  }
}

function extractContent(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  if (!("choices" in data)) return null;
  const choices = (data as { choices: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (typeof first !== "object" || first === null) return null;
  if (!("message" in first)) return null;
  const message = (first as { message: unknown }).message;
  if (typeof message !== "object" || message === null) return null;
  if (!("content" in message)) return null;
  const content = (message as { content: unknown }).content;
  return typeof content === "string" ? content : null;
}
