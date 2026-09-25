import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function Notebook() {
  useDocumentTitle("Notebook");
  return (
    <div className="page">
      <h1>Notebook</h1>
    </div>
  );
}
