import { CashFlowApp } from "../CashFlowApp";
import { requirePageUser } from "../../lib/auth";
export default async function DashboardPage() { await requirePageUser(); return <CashFlowApp view="dashboard" />; }
