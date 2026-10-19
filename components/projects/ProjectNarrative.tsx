/** Editorial structure from existing text; no invented case-study claims or fields. */
export function projectNarrative(description: string) {
  const sections: { title: string; text: string }[] = [];
  let title = "Project overview";
  let lines: string[] = [];
  function flush() {
    const text = lines.join("\n").trim();
    if (text) sections.push({ title, text });
    lines = [];
  }
  for (const line of description.replace(/\r\n/g, "\n").split("\n")) {
    const heading = line
      .trim()
      .match(
        /^(?:#{1,3}\s*)?(?:the\s+)?(overview|challenge|solution|approach|outcome|results?)(?::\s*(.*)|\s*)$/i,
      );
    if (!heading) lines.push(line);
    else {
      flush();
      title = heading[1][0].toUpperCase() + heading[1].slice(1).toLowerCase();
      if (heading[2]) lines.push(heading[2]);
    }
  }
  flush();
  return sections;
}

function paragraphs(text: string) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return text.split(/\n\s*\n/).flatMap((paragraph) => {
    if (paragraph.length <= 650) return [paragraph];
    const sentences = [...segmenter.segment(paragraph)].map(
      (part) => part.segment,
    );
    const parts: string[] = [];
    for (let index = 0; index < sentences.length; index += 3)
      parts.push(
        sentences
          .slice(index, index + 3)
          .join("")
          .trim(),
      );
    return parts;
  });
}

export default function ProjectNarrative({
  description,
}: {
  description: string;
}) {
  return (
    <div className="project-narrative">
      {projectNarrative(description).map((section, index) => (
        <section key={index} aria-labelledby={`project-story-${index}`}>
          <h2 id={`project-story-${index}`}>{section.title}</h2>
          {paragraphs(section.text).map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
