import Link from "next/link";
import PathwaysWorkspace from "../../pathway-applications/pathways-workspace";

export default function ProgressPathwaysPage() {
  return (
    <>
      <nav aria-label="Breadcrumb" style={{ padding: "20px 32px 0" }}>
        <Link href="/dashboard/progress">Progress</Link> / Pathways & partners
      </nav>
      <PathwaysWorkspace />
    </>
  );
}
