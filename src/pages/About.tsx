import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function About() {
  useDocumentTitle("About");
  return (
    <div className="page">
      <h1>About</h1>
    </div>
  );
}
