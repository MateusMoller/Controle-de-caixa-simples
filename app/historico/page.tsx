import { CashFlowApp } from "../CashFlowApp";
import { requirePageUser } from "../../lib/auth";

export default async function HistoryPage() {
  await requirePageUser();
  return <CashFlowApp view="history" />;
}
