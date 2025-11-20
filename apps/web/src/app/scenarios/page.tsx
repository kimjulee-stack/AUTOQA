import { ScenarioPanel } from "@/components/scenarios/scenario-panel";
import { fetchFromApiSafe } from "@/lib/api";
import type { Scenario } from "@/types";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const scenarios = await fetchFromApiSafe<Scenario[]>("/scenarios", []);

  return (
    <>
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>시나리오 저장소</h1>
      </header>
      <ScenarioPanel scenarios={scenarios} />
    </>
  );
}

