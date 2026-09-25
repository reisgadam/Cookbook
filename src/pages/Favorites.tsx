import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function Favorites() {
  useDocumentTitle("Favorites");
  return (
    <div className="page">
      <h1>Favorites</h1>
    </div>
  );
}
