import React from 'react';

/**
 * Renders assistant text. The knowledge base returns `**bold**` headings and
 * bullet lines, so those are turned into real markup instead of showing the
 * raw asterisks. Everything else is emitted as plain text — no HTML is
 * interpreted, so a model reply can never inject markup.
 */
export const AIMessageContent: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-2" />;

      // Split on **bold** spans, keeping the delimiters' contents.
      const parts = line.split(/\*\*(.+?)\*\*/g);

      return (
        <p key={i} className="min-w-0">
          {parts.map((part, j) =>
            // Odd indices are the captured groups, i.e. the bolded text.
            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
          )}
        </p>
      );
    })}
  </>
);
