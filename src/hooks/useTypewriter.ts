import { useState, useEffect } from 'react';

export function useTypewriter(
  lines: string[],
  onFinished?: () => void,
  speed: number = 25
) {
  const [displayLines, setDisplayLines] = useState<string[]>([]);

  useEffect(() => {
    if (!lines || lines.length === 0) {
      setDisplayLines([]);
      return;
    }

    let mounted = true;
    let lineIdx = 0;
    let charIdx = 0;
    const result = Array(lines.length).fill('');

    const tick = () => {
      if (!mounted) return;

      const currentLine = lines[lineIdx];
      if (!currentLine) {
        if (onFinished) onFinished();
        return;
      }

      result[lineIdx] = currentLine.slice(0, charIdx + 1);
      setDisplayLines([...result]);
      charIdx++;

      if (charIdx >= currentLine.length) {
        lineIdx++;
        charIdx = 0;

        if (lineIdx >= lines.length) {
          if (onFinished) onFinished();
          return;
        }

        setTimeout(tick, 200);
      } else {
        setTimeout(tick, speed);
      }
    };

    tick();

    return () => {
      mounted = false;
    };
  }, [lines.join('|'), speed, onFinished]);

  return displayLines;
}
