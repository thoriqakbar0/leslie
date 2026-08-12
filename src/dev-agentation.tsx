import { Agentation } from "agentation";

const AGENTATION_ENDPOINT = "http://127.0.0.1:4747";

export function DevAgentation() {
  return <Agentation endpoint={AGENTATION_ENDPOINT} />;
}
