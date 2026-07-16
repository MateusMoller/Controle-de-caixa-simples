import { CashFlowApp } from "../CashFlowApp";
import { requirePageUser } from "../../lib/auth";
export default async function MovementTypesPage(){await requirePageUser();return <CashFlowApp view="types"/>}
