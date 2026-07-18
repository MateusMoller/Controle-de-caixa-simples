import { CashFlowApp } from "../CashFlowApp";
import { requirePageUser } from "../../lib/auth";

export default async function PersonalizationPage() {
  await requirePageUser();
  return <CashFlowApp view="types" />;
}
