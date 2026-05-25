'use client';

export default function CodeDiffViewer({ code, language }) {
  if (!code) return null;
  const lines = code.split('\n');

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language || 'Code'}</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="code-content">
        {lines.map((line, i) => {
          let cls = 'code-line';
          if (line.startsWith('+')) cls += ' code-line-added';
          else if (line.startsWith('-')) cls += ' code-line-removed';
          return (
            <div key={i} className={cls}>
              <span className="code-line-number">{i + 1}</span>
              <span style={{ whiteSpace: 'pre' }}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
