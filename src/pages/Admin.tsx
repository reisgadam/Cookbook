import { useDocumentTitle } from "../hooks/useDocumentTitle";

export function Admin() {
  useDocumentTitle("Admin");
  return (
    <div className="page">
      <h1>Admin</h1>
    </div>
  );
}
