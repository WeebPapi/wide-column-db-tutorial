export function CodeBlock({ children }: { children: string }) {
  return <pre className="code"><code>{children}</code></pre>;
}
