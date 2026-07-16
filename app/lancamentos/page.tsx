import { CashFlowApp } from "../CashFlowApp";
import { requirePageUser } from "../../lib/auth";
export default async function EntriesPage() { await requirePageUser(); return <CashFlowApp view="entries" />; }
