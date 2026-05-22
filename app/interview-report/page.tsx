import { Suspense } from "react";
import InterviewReportClient from "./InterviewReportClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InterviewReportClient />
    </Suspense>
  );
}