import { redirect } from "next/navigation";

// This planner now lives at /dubai/analysis. Old links keep working.
export default function DubaiAnalysisV2Page() {
  redirect("/dubai/analysis");
}
