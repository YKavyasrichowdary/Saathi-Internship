import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/auth";

import opportunityService from "@/services/opportunity/opportunity.service";

import PreparationWizard from "@/components/roadmap/wizard/PreparationWizard";

interface Props {
  searchParams: Promise<{
    opportunityId?: string;
  }>;
}

export default async function PrepareRoadmapPage({
  searchParams,
}: Props) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { opportunityId } = await searchParams;

  // Default to 30 days from today if the opportunity has no deadline
  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + 30);
  let targetDate: string = fallbackDate.toISOString().split("T")[0];

  if (opportunityId) {
    const opportunity =
      await opportunityService.getOpportunity(
        opportunityId
      );

    if (opportunity?.deadline) {
      targetDate = new Date(
        opportunity.deadline
      )
        .toISOString()
        .split("T")[0];
    }
  }

  return (
    <AppShell
      title="AI Preparation Wizard"
      subtitle="Let's build your personalized execution roadmap."
    >
      <PreparationWizard
        opportunityId={opportunityId}
        targetDate={targetDate}
      />
    </AppShell>
  );
}