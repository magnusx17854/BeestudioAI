import { useState } from "react";
import { Check, Copy } from "lucide-react";

const CODE_LANGS = new Set([
  "typescript","javascript","bash","python","json","tsx","jsx","html","css",
  "rust","go","sql","yaml","toml","java","c","cpp","shell","sh","diff","text",
]);

type Span = { type: "text" | "bold" | "italic" | "code"; content: string };

function parseSpans(text: string): Span[] {
  const spans: Span[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) spans.push({ type: "text", content: buf });
    buf = "";
  };
  while (i < text.length) {
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        spans.push({ type: "code", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i) {
        flush();
        spans.push({ type: "bold", content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*" || (text[i] === "_" && text[i + 1] !== " ")) {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end > i + 1) {
        flush();
        spans.push({ type: "italic", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return spans;
}

export function InlineSpans({ text }: { text: string }) {
  return (
    <>
      {parseSpans(text).map((span, idx) => {
        if (span.type === "code")
          return (
            <code
              key={idx}
              className="rounded-md bg-white/[0.08] border border-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-[#F5C06B]"
            >
              {span.content}
            </code>
          );
        if (span.type === "bold")
          return (
            <strong key={idx} className="font-semibold text-[#ECECF1]">
              {span.content}
            </strong>
          );
        if (span.type === "italic")
          return (
            <em key={idx} className="italic">
              {span.content}
            </em>
          );
        return <span key={idx}>{span.content}</span>;
      })}
    </>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const label = lang && CODE_LANGS.has(lang) ? lang : lang ? lang : "text";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0C10]">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8E929F]">
          {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-[#8E929F] transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" /> Copied!
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed">
        <code className="font-mono text-[#D7DAE0]">{code}</code>
      </pre>
    </div>
  );
}

type Block =
  | { kind: "code"; lang: string; content: string }
  | { kind: "heading"; level: number; content: string }
  | { kind: "quote"; content: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "p"; content: string };

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseBlocks(src: string): Block[] {
  const lines = src.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim().toLowerCase();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        body.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ kind: "code", lang, content: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        content: heading[2],
      });
      i++;
      continue;
    }

    if (line.trimStart().startsWith("> ")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("> ")) {
        body.push(lines[i].trimStart().slice(2));
        i++;
      }
      blocks.push({ kind: "quote", content: body.join("\n") });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length) {
      const next = lines[i + 1];
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(next) && next.includes("-")) {
        const header = splitRow(line);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        blocks.push({ kind: "table", header, rows });
        continue;
      }
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].trimStart().startsWith("> ") &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("|")
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", content: para.join("\n") });
  }

  return blocks;
}

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="text-[15px] leading-[1.7] text-[#C9CBD4]">
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case "heading": {
            const size =
              block.level === 1
                ? "text-xl"
                : block.level === 2
                  ? "text-lg"
                  : "text-base";
            return (
              <p
                key={idx}
                className={`mt-4 mb-2 font-semibold text-[#ECECF1] first:mt-0 ${size}`}
              >
                <InlineSpans text={block.content} />
              </p>
            );
          }
          case "quote":
            return (
              <blockquote
                key={idx}
                className="my-3 border-l-2 border-[#F59E0B]/60 bg-[#F59E0B]/[0.05] py-2 pl-3 pr-2 text-[#B9BCC7]"
              >
                <InlineSpans text={block.content} />
              </blockquote>
            );
          case "ul":
            return (
              <ul key={idx} className="my-2 space-y-1 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#F59E0B]" />
                    <span>
                      <InlineSpans text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="my-2 space-y-1 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="min-w-[18px] pt-[1px] text-right text-[13px] font-medium text-[#F59E0B]">
                      {j + 1}.
                    </span>
                    <span>
                      <InlineSpans text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div
                key={idx}
                className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]"
              >
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-white/[0.04]">
                      {block.header.map((cell, j) => (
                        <th
                          key={j}
                          className="border-b border-white/[0.08] px-3 py-2 text-left font-semibold text-[#ECECF1]"
                        >
                          <InlineSpans text={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} className="odd:bg-white/[0.015]">
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className="border-b border-white/[0.04] px-3 py-2 align-top text-[#C9CBD4] last:border-b-0"
                          >
                            <InlineSpans text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "code":
            return <CodeBlock key={idx} lang={block.lang} code={block.content} />;
          default:
            return (
              <p key={idx} className="my-2 whitespace-pre-wrap first:mt-0">
                <InlineSpans text={block.content} />
              </p>
            );
        }
      })}
    </div>
  );
}
