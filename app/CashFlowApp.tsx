"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "dashboard" | "entries" | "types" | "history";
type PeriodFilter = "month" | "30days" | "90days" | "year" | "all" | "custom";
type Entry = {
  id: number;
  groupId: string;
  description: string;
  contact: string;
  category: string;
  type: "income" | "expense";
  amountCents: number;
  paidAmountCents: number;
  issueDate: string;
  dueDate: string;
  settlementDate: string | null;
  paymentMethod: string;
  installment: number;
  installments: number;
  interestType: "none" | "simple" | "compound";
  interestRateBps: number;
  paid: boolean;
  createdBy: string;
  createdAt: string;
};
type MovementType = { id: number; name: string };
type ConfigKind = "income" | "expense" | "description" | "contact";
type ConfigLists = {
  income: MovementType[];
  expense: MovementType[];
  descriptions: MovementType[];
  contacts: MovementType[];
};
const fallbackIncomeTypes = ["Vendas", "Serviços", "Outros"];
const fallbackExpenseTypes = [
  "Moradia",
  "Fornecedores",
  "Transporte",
  "Alimentação",
  "Saúde",
  "Lazer",
  "Outros",
];
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const monthName = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
const shortMonth = new Intl.DateTimeFormat("pt-BR", { month: "short" });
function isoMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function moveMonth(month: string, offset: number) {
  const [y, m] = month.split("-").map(Number);
  return isoMonth(new Date(y, m - 1 + offset, 1));
}
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthEnd(month: string) {
  const [year, number] = month.split("-").map(Number);
  return isoDate(new Date(year, number, 0));
}
function labelDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}
function entryStatus(entry: Entry) {
  if (entry.paidAmountCents >= entry.amountCents)
    return entry.type === "income" ? "Recebido" : "Pago";
  if (entry.paidAmountCents > 0) return "Parcial";
  if (entry.dueDate < new Date().toISOString().slice(0, 10)) return "Vencido";
  return entry.type === "income" ? "Previsto" : "Em aberto";
}
function parseMoneyInput(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

export function CashFlowApp({ view }: { view: View }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [movementTypes, setMovementTypes] = useState<ConfigLists>({
    income: [],
    expense: [],
    descriptions: [],
    contacts: [],
  });
  const [month, setMonth] = useState(isoMonth());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [settlementEntry, setSettlementEntry] = useState<Entry | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "all" | "income" | "expense" | "pending"
  >("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  useEffect(() => {
    Promise.all([
      fetch("/api/entries"),
      fetch("/api/movement-types"),
      fetch("/api/auth/status"),
    ])
      .then(async ([entryResponse, typeResponse, authResponse]) => {
        const entryData = await entryResponse.json();
        const typeData = await typeResponse.json();
        const authData = await authResponse.json();
        if (!entryResponse.ok || !typeResponse.ok || !authResponse.ok)
          throw new Error();
        setEntries(entryData.entries);
        setMovementTypes(typeData);
        const login = String(authData.user?.username || "Usuário");
        setUserName(login.charAt(0).toUpperCase() + login.slice(1));
      })
      .catch(() => setError("Não foi possível carregar os dados agora."))
      .finally(() => setLoading(false));
  }, []);
  const dashboardEntries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const today = new Date();
    let startDate = "";
    let endDate = "";
    if (periodFilter === "month") {
      startDate = `${month}-01`;
      endDate = monthEnd(month);
    } else if (periodFilter === "30days" || periodFilter === "90days") {
      const days = periodFilter === "30days" ? 29 : 89;
      startDate = isoDate(
        new Date(today.getFullYear(), today.getMonth(), today.getDate() - days),
      );
      endDate = isoDate(today);
    } else if (periodFilter === "year") {
      startDate = `${today.getFullYear()}-01-01`;
      endDate = `${today.getFullYear()}-12-31`;
    } else if (periodFilter === "custom") {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    return entries
      .filter(
        (entry) =>
          (!startDate || entry.dueDate >= startDate) &&
          (!endDate || entry.dueDate <= endDate),
      )
      .filter(
        (entry) =>
          categoryFilter === "all" || entry.category === categoryFilter,
      )
      .filter(
        (entry) =>
          !term ||
          `${entry.description} ${entry.contact} ${entry.category}`
            .toLocaleLowerCase("pt-BR")
            .includes(term),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [
    entries,
    month,
    periodFilter,
    customStartDate,
    customEndDate,
    search,
    categoryFilter,
  ]);
  const totals = useMemo(
    () =>
      dashboardEntries.reduce(
        (a, e) => {
          a[e.type] += e.amountCents;
          a.paid += e.paidAmountCents;
          if (e.type === "income") a.realizedIncome += e.paidAmountCents;
          else a.realizedExpense += e.paidAmountCents;
          const remaining = Math.max(0, e.amountCents - e.paidAmountCents);
          if (remaining > 0) {
            a.pending++;
            if (e.type === "income") a.receivable += remaining;
            else a.payable += remaining;
          }
          return a;
        },
        {
          income: 0,
          expense: 0,
          pending: 0,
          paid: 0,
          receivable: 0,
          payable: 0,
          realizedIncome: 0,
          realizedExpense: 0,
        },
      ),
    [dashboardEntries],
  );
  const visible = useMemo(() => {
    return dashboardEntries
      .filter(
        (e) =>
          filter === "all" ||
          (filter === "pending" ? !e.paid : e.type === filter),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [dashboardEntries, filter]);
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    dashboardEntries
      .filter((e) => e.type === "expense")
      .forEach((e) =>
        map.set(e.category, (map.get(e.category) || 0) + e.amountCents),
      );
    return [...map].sort((a, b) => b[1] - a[1]);
  }, [dashboardEntries]);
  const evolution = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const key = moveMonth(month, i - 5);
        const rows = entries.filter((e) => e.dueDate.startsWith(key));
        return {
          key,
          label: shortMonth
            .format(new Date(`${key}-02T12:00:00`))
            .replace(".", ""),
          income: rows
            .filter((e) => e.type === "income")
            .reduce((s, e) => s + e.amountCents, 0),
          expense: rows
            .filter((e) => e.type === "expense")
            .reduce((s, e) => s + e.amountCents, 0),
        };
      }),
    [entries, month],
  );
  const maxChart = Math.max(
    1,
    ...evolution.flatMap((e) => [e.income, e.expense]),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(
      editingEntry ? `/api/entries/${editingEntry.id}` : "/api/entries",
      {
        method: editingEntry ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      },
    );
    const data = await response.json();
    if (!response.ok)
      return setError(data.error || "Confira os dados e tente novamente.");
    if (editingEntry)
      setEntries((c) =>
        c.map((item) => (item.id === editingEntry.id ? data.entry : item)),
      );
    else setEntries((c) => [...c, ...data.entries]);
    setMonth(String(form.get("dueDate")).slice(0, 7));
    setEditingEntry(null);
    setOpen(false);
  }
  function togglePaid(entry: Entry) {
    setSettlementEntry(entry);
  }
  async function confirmSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settlementEntry) return;
    const form = new FormData(event.currentTarget);
    const paymentCents = parseMoneyInput(
      String(form.get("paymentAmount") || "0"),
    );
    const paidAmountCents = settlementEntry.paidAmountCents + paymentCents;
    if (!Number.isFinite(paymentCents) || paymentCents <= 0)
      return setError("Informe um valor pago válido.");
    await updateSettlement(settlementEntry, {
      paidAmountCents,
      settlementDate: String(form.get("settlementDate")),
      paymentMethod: String(form.get("paymentMethod")),
    });
  }
  async function reverseSettlement() {
    if (
      !settlementEntry ||
      !window.confirm(
        "Deseja estornar todos os valores realizados deste lançamento?",
      )
    )
      return;
    await updateSettlement(settlementEntry, {
      paidAmountCents: 0,
      settlementDate: null,
      paymentMethod: settlementEntry.paymentMethod,
    });
  }
  async function updateSettlement(
    entry: Entry,
    payload: {
      paidAmountCents: number;
      settlementDate: string | null;
      paymentMethod: string;
    },
  ) {
    const r = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (r.ok) {
      setEntries((c) => c.map((i) => (i.id === entry.id ? data.entry : i)));
      setSettlementEntry(null);
    } else setError(data.error || "Não foi possível confirmar a baixa.");
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  function editEntry(entry: Entry) {
    setEditingEntry(entry);
    setOpen(true);
  }
  async function deleteEntry(entry: Entry) {
    const parcelWarning =
      entry.installments > 1
        ? `\nEsta ação excluirá somente a parcela ${entry.installment} de ${entry.installments}.`
        : "";
    if (
      !window.confirm(
        `Excluir o lançamento “${entry.description}”?${parcelWarning}`,
      )
    )
      return;
    const response = await fetch(`/api/entries/${entry.id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    else setError("Não foi possível excluir o lançamento.");
  }
  function newEntry() {
    setEditingEntry(null);
    setOpen(true);
  }
  const monthDate = new Date(`${month}-02T12:00:00`);
  const balance = totals.income - totals.expense;
  const titles = {
    dashboard: ["Visão geral", "Acompanhe o presente e o futuro do seu caixa"],
    entries: ["Lançamentos", "Organize entradas, saídas e parcelas"],
    types: ["Personalização", "Organize as opções usadas nos lançamentos"],
    history: ["Histórico", "Veja quem adicionou cada lançamento"],
  };
  return (
    <div className="appLayout">
      <aside className={`sidebar ${mobileNav ? "show" : ""}`}>
        <Link className="brand" href="/dashboard">
          <span>f</span> Fluxo Claro
        </Link>
        <nav>
          <p>MENU PRINCIPAL</p>
          <Link
            className={view === "dashboard" ? "active" : ""}
            href="/dashboard"
          >
            <i>⌂</i> Dashboard
          </Link>
          <Link
            className={view === "entries" ? "active" : ""}
            href="/lancamentos"
          >
            <i>⇄</i> Lançamentos
          </Link>
          <Link
            className={view === "history" ? "active" : ""}
            href="/historico"
          >
            <i>◷</i> Histórico
          </Link>
          <p className="secondaryNavLabel">CONFIGURAÇÕES</p>
          <Link
            className={view === "types" ? "active" : ""}
            href="/personalizacao"
          >
            <i>≡</i> Personalização
          </Link>
        </nav>
        <div className="profile">
          <div className="avatar">{userName.slice(0, 2).toUpperCase()}</div>
          <div>
            <b>{userName}</b>
            <span>Usuário</span>
          </div>
          <button
            className="logoutButton"
            onClick={logout}
            aria-label="Sair"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="mainArea">
        <header className="appTop">
          <button
            className="menuButton"
            onClick={() => setMobileNav(!mobileNav)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div>
            <p className="eyebrow">{titles[view][0]}</p>
            <h1>{titles[view][1]}</h1>
          </div>
          <div className="topActions">
            <button className="notification" aria-label="Notificações">
              ●
            </button>
            <button className="primary" onClick={newEntry}>
              ＋ Novo lançamento
            </button>
          </div>
        </header>
        <section className="monthNav">
          <button onClick={() => setMonth(moveMonth(month, -1))}>←</button>
          <strong>{monthName.format(monthDate)}</strong>
          <button onClick={() => setMonth(moveMonth(month, 1))}>→</button>
          <button className="today" onClick={() => setMonth(isoMonth())}>
            Hoje
          </button>
        </section>
        {error && <p className="notice">{error}</p>}
        {view === "dashboard" && (
          <Dashboard
            totals={totals}
            balance={balance}
            evolution={evolution}
            maxChart={maxChart}
            categories={categoryTotals}
            entries={dashboardEntries}
            allEntries={entries}
            month={month}
            loading={loading}
            onToggle={togglePaid}
            onEdit={editEntry}
            onDelete={deleteEntry}
            categoryOptions={[
              ...movementTypes.income,
              ...movementTypes.expense,
            ].map((item) => item.name)}
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}
        {view === "entries" && (
          <Entries
            entries={visible}
            categoryOptions={[
              ...movementTypes.income,
              ...movementTypes.expense,
            ].map((item) => item.name)}
            loading={loading}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            onToggle={togglePaid}
            onEdit={editEntry}
            onDelete={deleteEntry}
            onNew={newEntry}
          />
        )}
        {view === "types" && (
          <MovementTypes types={movementTypes} setTypes={setMovementTypes} />
        )}
        {view === "history" && <History entries={entries} loading={loading} />}
      </main>
      {open && (
        <EntryModal
          key={editingEntry?.id || "new"}
          types={movementTypes}
          entry={editingEntry}
          onClose={() => {
            setOpen(false);
            setEditingEntry(null);
          }}
          onSubmit={submit}
        />
      )}
      {settlementEntry && (
        <SettlementModal
          entry={settlementEntry}
          onClose={() => setSettlementEntry(null)}
          onConfirm={confirmSettlement}
          onReverse={reverseSettlement}
        />
      )}
    </div>
  );
}

function History({ entries, loading }: { entries: Entry[]; loading: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    entries.forEach((entry) =>
      map.set(entry.groupId, [...(map.get(entry.groupId) || []), entry]),
    );
    return [...map.values()]
      .map((rows) => ({
        entry: rows[0],
        total: rows.reduce((sum, row) => sum + row.amountCents, 0),
      }))
      .sort(
        (a, b) =>
          new Date(b.entry.createdAt).getTime() -
          new Date(a.entry.createdAt).getTime(),
      );
  }, [entries]);
  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <div className="content">
      <section className="panel historyPanel">
        <div className="ledgerHead">
          <div>
            <h2>Histórico de lançamentos</h2>
            <p>Registro de quem adicionou cada movimentação ao caixa</p>
          </div>
          <span className="historyCount">{groups.length} registro(s)</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Lançamento</th>
                <th>Tipo</th>
                <th>Parcelas</th>
                <th>Valor total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty">
                    Carregando histórico…
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Empty />
                  </td>
                </tr>
              ) : (
                groups.map(({ entry, total }) => (
                  <tr key={entry.groupId}>
                    <td>{dateTime.format(new Date(entry.createdAt))}</td>
                    <td>
                      <span className="historyUser">
                        {entry.createdBy.charAt(0).toUpperCase() +
                          entry.createdBy.slice(1)}
                      </span>
                    </td>
                    <td>
                      <b>{entry.description}</b>
                      <small className="historyMeta">
                        {entry.category}
                        {entry.contact ? ` · ${entry.contact}` : ""}
                      </small>
                    </td>
                    <td>
                      <span className={`historyType ${entry.type}`}>
                        {entry.type === "income" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td>
                      {entry.installments > 1
                        ? `${entry.installments} parcelas`
                        : "À vista"}
                    </td>
                    <td className={entry.type}>{money.format(total / 100)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Dashboard({
  totals,
  balance,
  evolution,
  maxChart,
  categories,
  entries,
  allEntries,
  month,
  loading,
  onToggle,
  onEdit,
  onDelete,
  categoryOptions,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  periodFilter,
  setPeriodFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
}: {
  totals: {
    income: number;
    expense: number;
    pending: number;
    paid: number;
    receivable: number;
    payable: number;
    realizedIncome: number;
    realizedExpense: number;
  };
  balance: number;
  evolution: { key: string; label: string; income: number; expense: number }[];
  maxChart: number;
  categories: [string, number][];
  entries: Entry[];
  allEntries: Entry[];
  month: string;
  loading: boolean;
  onToggle: (e: Entry) => void;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
  categoryOptions: string[];
  search: string;
  setSearch: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (value: PeriodFilter) => void;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
}) {
  const [todayDate] = useState(() => new Date());
  const future = allEntries
    .filter((e) => !e.paid && e.dueDate >= `${moveMonth(month, 1)}-01`)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const futureReceivable = future
    .filter((e) => e.type === "income")
    .reduce(
      (sum, e) => sum + Math.max(0, e.amountCents - e.paidAmountCents),
      0,
    );
  const futurePayable = future
    .filter((e) => e.type === "expense")
    .reduce(
      (sum, e) => sum + Math.max(0, e.amountCents - e.paidAmountCents),
      0,
    );
  const today = todayDate.toISOString().slice(0, 10);
  const sevenDate = new Date(todayDate);
  sevenDate.setDate(sevenDate.getDate() + 7);
  const inSeven = sevenDate.toISOString().slice(0, 10);
  const overdueEntries = entries
    .filter(
      (e) =>
        e.type === "expense" &&
        e.paidAmountCents < e.amountCents &&
        e.dueDate < today,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overdue = overdueEntries.reduce(
    (sum, e) => sum + e.amountCents - e.paidAmountCents,
    0,
  );
  const dueSoon = entries
    .filter(
      (e) =>
        e.paidAmountCents < e.amountCents &&
        e.dueDate >= today &&
        e.dueDate <= inSeven,
    )
    .reduce((sum, e) => sum + e.amountCents - e.paidAmountCents, 0);
  const receiptRate = totals.income
    ? Math.round((totals.realizedIncome / totals.income) * 100)
    : 0;
  const paymentRate = totals.expense
    ? Math.min(100, Math.round((totals.realizedExpense / totals.expense) * 100))
    : 0;
  const hasDashboardFilters =
    search !== "" || categoryFilter !== "all" || periodFilter !== "month";
  function clearDashboardFilters() {
    setSearch("");
    setCategoryFilter("all");
    setPeriodFilter("month");
    setCustomStartDate("");
    setCustomEndDate("");
  }
  return (
    <div className="content">
      <section className="panel dashboardFilters">
        <div className="filterBar">
          <label className="searchField">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar descrição ou contato"
              aria-label="Buscar no dashboard"
            />
          </label>
          <label className="categorySelect">
            <span>Categoria</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {[...new Set(categoryOptions)].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="categorySelect periodSelect">
            <span>Período de vencimento</span>
            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(event.target.value as PeriodFilter)
              }
            >
              <option value="month">Mês selecionado</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
              <option value="year">Este ano</option>
              <option value="all">Todo o período</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <div className="filterResult">
            <b>{entries.length}</b>{" "}
            {entries.length === 1 ? "resultado" : "resultados"}
            {hasDashboardFilters && (
              <button onClick={clearDashboardFilters}>Limpar</button>
            )}
          </div>
        </div>
        {periodFilter === "custom" && (
          <div className="customPeriod">
            <label>
              <span>Vencimento inicial</span>
              <input
                type="date"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            </label>
            <span className="periodArrow">até</span>
            <label>
              <span>Vencimento final</span>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(event) => setCustomEndDate(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>
      <section className="kpis">
        <article>
          <div className="kpiTop">
            <span className="kpiIcon green">↗</span>
            <em>ENTRADAS PREVISTAS</em>
          </div>
          <strong>{money.format(totals.income / 100)}</strong>
          <small>
            {money.format(totals.realizedIncome / 100)} já recebidos
          </small>
        </article>
        <article className="paidHighlight">
          <div className="kpiTop">
            <span className="kpiIcon coral">↘</span>
            <em>SAÍDAS PREVISTAS / PAGAS</em>
          </div>
          <strong>{money.format(totals.expense / 100)}</strong>
          <small className="paidTotal">
            ✓ {money.format(totals.realizedExpense / 100)} efetivamente pagos
          </small>
        </article>
        <article className="featured">
          <div className="kpiTop">
            <span className="kpiIcon gold">◇</span>
            <em>SALDO PROJETADO</em>
          </div>
          <strong>{money.format(balance / 100)}</strong>
          <small>
            Saldo realizado:{" "}
            {money.format(
              (totals.realizedIncome - totals.realizedExpense) / 100,
            )}
          </small>
        </article>
        <article className="openBalance receivable">
          <div className="kpiTop">
            <span className="kpiIcon green">＋</span>
            <em>A RECEBER</em>
          </div>
          <strong>{money.format(totals.receivable / 100)}</strong>
          <small>Saldo pendente no período</small>
        </article>
        <article className="openBalance payable">
          <div className="kpiTop">
            <span className="kpiIcon coral">−</span>
            <em>A PAGAR</em>
          </div>
          <strong>{money.format(totals.payable / 100)}</strong>
          <small>Saldo pendente no período</small>
        </article>
        <article>
          <div className="kpiTop">
            <span className="kpiIcon blue">✓</span>
            <em>TOTAL REALIZADO</em>
          </div>
          <strong>{money.format(totals.paid / 100)}</strong>
          <small>Recebimentos + pagamentos</small>
        </article>
      </section>
      <section className="spreadsheetKpis">
        <article className="overdueKpi">
          <span>CONTAS VENCIDAS</span>
          <strong>{money.format(overdue / 100)}</strong>
          <small>{overdueEntries.length} conta(s) aguardando pagamento</small>
        </article>
        <article>
          <span>VENCE EM 7 DIAS</span>
          <strong>{money.format(dueSoon / 100)}</strong>
        </article>
        <article>
          <span>TAXA DE RECEBIMENTO</span>
          <strong>{receiptRate}%</strong>
        </article>
        <article>
          <span>TAXA DE PAGAMENTO</span>
          <strong>{paymentRate}%</strong>
        </article>
      </section>
      <section className="panel overduePanel">
        <PanelHead
          title="Contas vencidas"
          subtitle={`${overdueEntries.length} conta(s) não pagas até hoje · ${money.format(overdue / 100)} pendentes`}
          action={<Link href="/lancamentos">Ver lançamentos →</Link>}
        />
        <LedgerTable
          entries={overdueEntries.slice(0, 6)}
          loading={loading}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
      <section className="dashGrid">
        <article className="panel chartPanel">
          <PanelHead
            title="Evolução do caixa"
            subtitle="Entradas e saídas nos últimos 6 meses"
          />
          <div className="legend">
            <span>
              <i className="dot incomeDot" />
              Entradas
            </span>
            <span>
              <i className="dot expenseDot" />
              Saídas
            </span>
          </div>
          <div className="barChart">
            {evolution.map((e) => (
              <div className="barGroup" key={e.key}>
                <div className="bars">
                  <span
                    className="bar in"
                    style={{
                      height: `${Math.max(3, (e.income / maxChart) * 100)}%`,
                    }}
                    title={money.format(e.income / 100)}
                  />
                  <span
                    className="bar out"
                    style={{
                      height: `${Math.max(3, (e.expense / maxChart) * 100)}%`,
                    }}
                    title={money.format(e.expense / 100)}
                  />
                </div>
                <b>{e.label}</b>
              </div>
            ))}
          </div>
        </article>
        <article className="panel categoryPanel">
          <PanelHead
            title="Saídas por categoria"
            subtitle="Distribuição deste mês"
          />
          {categories.length ? (
            <div className="categoryList">
              {categories.slice(0, 5).map(([name, value], i) => (
                <div key={name}>
                  <div className="categoryLine">
                    <span>
                      <i className={`catColor c${i}`} />
                      {name}
                    </span>
                    <b>{money.format(value / 100)}</b>
                  </div>
                  <div className="progress">
                    <span
                      className={`c${i}`}
                      style={{ width: `${(value / categories[0][1]) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty compact />
          )}
        </article>
      </section>
      <section className="panel recent">
        <PanelHead
          title="Lançamentos do período"
          subtitle="Movimentações pela data de vencimento no mês selecionado"
          action={<Link href="/lancamentos">Ver todos →</Link>}
        />
        <LedgerTable
          entries={[...entries]
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .slice(0, 5)}
          loading={loading}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
      <section className="futureSection">
        <div className="futureTitle">
          <div>
            <p className="eyebrow">PRÓXIMOS MESES</p>
            <h2>Movimentações futuras</h2>
            <span>
              Calculadas automaticamente pela data de vencimento de cada
              lançamento.
            </span>
          </div>
          <Link href="/lancamentos">Gerenciar lançamentos →</Link>
        </div>
        <div className="futureBalances">
          <article className="futureReceive">
            <span>FUTURO A RECEBER</span>
            <strong>{money.format(futureReceivable / 100)}</strong>
            <small>
              {future.filter((e) => e.type === "income").length} lançamento(s)
              em aberto
            </small>
          </article>
          <article className="futurePay">
            <span>FUTURO A PAGAR</span>
            <strong>{money.format(futurePayable / 100)}</strong>
            <small>
              {future.filter((e) => e.type === "expense").length} lançamento(s)
              em aberto
            </small>
          </article>
          <article className="futureNet">
            <span>SALDO FUTURO</span>
            <strong>
              {money.format((futureReceivable - futurePayable) / 100)}
            </strong>
            <small>Diferença entre o que entra e sai</small>
          </article>
        </div>
        <section className="panel">
          <PanelHead
            title="Próximos vencimentos"
            subtitle="Primeiras movimentações após o período selecionado"
          />
          <LedgerTable
            entries={future.slice(0, 6)}
            loading={loading}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </section>
      </section>
    </div>
  );
}
function Entries({
  entries,
  categoryOptions,
  loading,
  filter,
  setFilter,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  periodFilter,
  setPeriodFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onToggle,
  onEdit,
  onDelete,
  onNew,
}: {
  entries: Entry[];
  categoryOptions: string[];
  loading: boolean;
  filter: string;
  setFilter: (v: "all" | "income" | "expense" | "pending") => void;
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (v: PeriodFilter) => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
  onToggle: (e: Entry) => void;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
  onNew: () => void;
}) {
  const hasFilters =
    filter !== "all" ||
    search !== "" ||
    categoryFilter !== "all" ||
    periodFilter !== "month";
  function clear() {
    setFilter("all");
    setSearch("");
    setCategoryFilter("all");
    setPeriodFilter("month");
    setCustomStartDate("");
    setCustomEndDate("");
  }
  return (
    <div className="content">
      <section className="panel entriesPanel">
        <div className="ledgerHead">
          <div>
            <h2>Todos os lançamentos</h2>
            <p>Gerencie os vencimentos e confirme pagamentos</p>
          </div>
          <div className="filters">
            {(
              [
                ["all", "Todos"],
                ["income", "Entradas"],
                ["expense", "Saídas"],
                ["pending", "Pendentes"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={filter === value ? "active" : ""}
                key={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="filterBar">
          <label className="searchField">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descrição ou contato"
              aria-label="Buscar lançamentos"
            />
          </label>
          <label className="categorySelect">
            <span>Categoria</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              {[...new Set(categoryOptions)].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="categorySelect periodSelect">
            <span>Período de vencimento</span>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            >
              <option value="month">Mês selecionado</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="90days">Últimos 90 dias</option>
              <option value="year">Este ano</option>
              <option value="all">Todo o período</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          <div className="filterResult">
            <b>{entries.length}</b>{" "}
            {entries.length === 1 ? "resultado" : "resultados"}
            {hasFilters && <button onClick={clear}>Limpar</button>}
          </div>
        </div>
        {periodFilter === "custom" && (
          <div className="customPeriod">
            <label>
              <span>Vencimento inicial</span>
              <input
                type="date"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </label>
            <span className="periodArrow">até</span>
            <label>
              <span>Vencimento final</span>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </label>
          </div>
        )}
        <LedgerTable
          entries={entries}
          loading={loading}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
        {!loading && entries.length === 0 && !hasFilters && (
          <button className="emptyAction" onClick={onNew}>
            ＋ Criar lançamento
          </button>
        )}
      </section>
    </div>
  );
}
function Accounts({
  kind,
  entries,
  loading,
  onToggle,
  onNew,
}: {
  kind: "income" | "expense";
  entries: Entry[];
  loading: boolean;
  onToggle: (e: Entry) => void;
  onNew: () => void;
}) {
  const [status, setStatus] = useState<"open" | "overdue" | "settled" | "all">(
    "open",
  );
  const today = new Date().toISOString().slice(0, 10);
  const rows = entries.filter((e) => e.type === kind);
  const overdue = rows.filter((e) => !e.paid && e.dueDate < today);
  const open = rows.filter((e) => !e.paid && e.dueDate >= today);
  const settled = rows.filter((e) => e.paid);
  const shown = (
    status === "overdue"
      ? overdue
      : status === "settled"
        ? settled
        : status === "open"
          ? open
          : rows
  ).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const sum = (list: Entry[]) => list.reduce((s, e) => s + e.amountCents, 0);
  const noun = kind === "expense" ? "pagamento" : "recebimento";
  return (
    <div className="content accountPage">
      <section className="accountKpis">
        <article>
          <span>EM ABERTO</span>
          <strong>{money.format(sum(open) / 100)}</strong>
          <small>{open.length} conta(s) a vencer</small>
        </article>
        <article className="danger">
          <span>VENCIDAS</span>
          <strong>{money.format(sum(overdue) / 100)}</strong>
          <small>{overdue.length} conta(s) precisam de atenção</small>
        </article>
        <article>
          <span>{kind === "expense" ? "PAGO" : "RECEBIDO"}</span>
          <strong>{money.format(sum(settled) / 100)}</strong>
          <small>{settled.length} baixa(s) confirmadas</small>
        </article>
      </section>
      <section className="panel entriesPanel">
        <div className="ledgerHead">
          <div>
            <h2>
              {kind === "expense"
                ? "Agenda de pagamentos"
                : "Agenda de recebimentos"}
            </h2>
            <p>
              Controle por vencimento, situação e{" "}
              {kind === "expense" ? "fornecedor" : "cliente"}
            </p>
          </div>
          <div className="filters">
            {(
              [
                ["open", "Em aberto"],
                ["overdue", "Vencidas"],
                ["settled", kind === "expense" ? "Pagas" : "Recebidas"],
                ["all", "Todas"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={status === value ? "active" : ""}
                key={value}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <AccountTable
          entries={shown}
          loading={loading}
          kind={kind}
          onToggle={onToggle}
        />
        {!loading && shown.length === 0 && (
          <button className="emptyAction" onClick={onNew}>
            ＋ Adicionar conta
          </button>
        )}
      </section>
      <p className="accountTip">
        Marque a caixa ao lado de cada item para confirmar o {noun}. Parcelas
        são controladas individualmente.
      </p>
    </div>
  );
}
function AccountTable({
  entries,
  loading,
  kind,
  onToggle,
}: {
  entries: Entry[];
  loading: boolean;
  kind: "income" | "expense";
  onToggle: (e: Entry) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="tableWrap">
      <table className="accountTable">
        <thead>
          <tr>
            <th>Status</th>
            <th>Descrição</th>
            <th>{kind === "expense" ? "Fornecedor" : "Cliente"}</th>
            <th>Vencimento</th>
            <th>Situação</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="empty">
                Carregando contas…
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <Empty />
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const overdue = !e.paid && e.dueDate < today;
              return (
                <tr key={e.id} className={overdue ? "overdueRow" : ""}>
                  <td>
                    <button
                      className={`status ${e.paid ? "done" : ""}`}
                      onClick={() => onToggle(e)}
                    >
                      {e.paid ? "✓" : ""}
                    </button>
                  </td>
                  <td>
                    <b>{e.description}</b>
                    {e.installments > 1 && (
                      <small className="accountInstallment">
                        Parcela {e.installment} de {e.installments}
                      </small>
                    )}
                  </td>
                  <td>
                    {e.contact || (
                      <span className="mutedDash">Não informado</span>
                    )}
                  </td>
                  <td>{labelDate(e.dueDate)}</td>
                  <td>
                    <span
                      className={`situation ${e.paid ? "settled" : overdue ? "overdue" : "open"}`}
                    >
                      {e.paid
                        ? kind === "expense"
                          ? "Pago"
                          : "Recebido"
                        : overdue
                          ? "Vencido"
                          : "Em aberto"}
                    </span>
                  </td>
                  <td className={kind}>{money.format(e.amountCents / 100)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
function Reports({
  totals,
  balance,
  evolution,
  maxChart,
  categories,
}: {
  totals: { income: number; expense: number };
  balance: number;
  evolution: { key: string; label: string; income: number; expense: number }[];
  maxChart: number;
  categories: [string, number][];
}) {
  const margin = totals.income
    ? Math.round((balance / totals.income) * 100)
    : 0;
  return (
    <div className="content reports">
      <section className="reportSummary">
        <div>
          <span>Resultado do mês</span>
          <strong>{money.format(balance / 100)}</strong>
          <small className={balance >= 0 ? "positive" : "negative"}>
            {margin}% de margem sobre as entradas
          </small>
        </div>
        <div>
          <span>Total movimentado</span>
          <strong>
            {money.format((totals.income + totals.expense) / 100)}
          </strong>
          <small>Entradas + saídas</small>
        </div>
        <div>
          <span>Maior categoria de saída</span>
          <strong>{categories[0]?.[0] || "—"}</strong>
          <small>
            {categories[0]
              ? money.format(categories[0][1] / 100)
              : "Sem despesas no mês"}
          </small>
        </div>
      </section>
      <section className="panel reportChart">
        <PanelHead
          title="Comparativo mensal"
          subtitle="Visão consolidada dos últimos 6 meses"
        />
        <div className="wideChart">
          {evolution.map((e) => (
            <div className="wideRow" key={e.key}>
              <b>{e.label}</b>
              <div>
                <span
                  className="wideIn"
                  style={{ width: `${(e.income / maxChart) * 100}%` }}
                />
                <span
                  className="wideOut"
                  style={{ width: `${(e.expense / maxChart) * 100}%` }}
                />
              </div>
              <small>{money.format((e.income - e.expense) / 100)}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel categoryReport">
        <PanelHead
          title="Detalhamento por categoria"
          subtitle="Participação das despesas no mês"
        />
        <div className="reportRows">
          {categories.map(([name, value]) => (
            <div key={name}>
              <span>{name}</span>
              <b>{money.format(value / 100)}</b>
              <em>
                {totals.expense
                  ? Math.round((value / totals.expense) * 100)
                  : 0}
                %
              </em>
            </div>
          ))}
          {!categories.length && <Empty compact />}
        </div>
      </section>
    </div>
  );
}
function MovementTypes({
  types,
  setTypes,
}: {
  types: ConfigLists;
  setTypes: React.Dispatch<React.SetStateAction<ConfigLists>>;
}) {
  const [error, setError] = useState("");
  async function add(event: FormEvent<HTMLFormElement>, kind: ConfigKind) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/movement-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, name: form.get("name") }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error);
    const list =
      kind === "description"
        ? "descriptions"
        : kind === "contact"
          ? "contacts"
          : kind;
    setTypes((current) => ({
      ...current,
      [list]: [...current[list], data.item].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    }));
    event.currentTarget.reset();
  }
  async function remove(kind: ConfigKind, id: number) {
    const response = await fetch(`/api/movement-types/${kind}/${id}`, {
      method: "DELETE",
    });
    if (response.ok)
      setTypes((current) => {
        const list =
          kind === "description"
            ? "descriptions"
            : kind === "contact"
              ? "contacts"
              : kind;
        return {
          ...current,
          [list]: current[list].filter((item) => item.id !== id),
        };
      });
  }
  return (
    <div className="content typeModule">
      <div className="typeIntro">
        <div>
          <h2>Personalização</h2>
          <p>
            Gerencie as opções validadas disponíveis ao cadastrar um lançamento.
          </p>
        </div>
      </div>
      {error && <p className="notice typeNotice">{error}</p>}
      <section className="typeTables">
        <TypeTable
          title="Tipos de entrada"
          hint="Ex.: vendas, serviços e comissões"
          kind="income"
          items={types.income}
          onAdd={add}
          onRemove={remove}
        />
        <TypeTable
          title="Descrições"
          hint="Ex.: compra de mercadorias ou venda de produtos"
          kind="description"
          items={types.descriptions}
          onAdd={add}
          onRemove={remove}
        />
        <TypeTable
          title="Fornecedores e clientes"
          hint="Cadastre quem paga ou recebe cada lançamento"
          kind="contact"
          items={types.contacts}
          onAdd={add}
          onRemove={remove}
        />
        <TypeTable
          title="Tipos de saída"
          hint="Ex.: fornecedores, aluguel e impostos"
          kind="expense"
          items={types.expense}
          onAdd={add}
          onRemove={remove}
        />
      </section>
    </div>
  );
}
function TypeTable({
  title,
  hint,
  kind,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  kind: ConfigKind;
  items: MovementType[];
  onAdd: (e: FormEvent<HTMLFormElement>, kind: ConfigKind) => void;
  onRemove: (kind: ConfigKind, id: number) => void;
}) {
  return (
    <section className={`panel typeTable ${kind}`}>
      <div className="typeTableHead">
        <span className="typeSymbol">
          {kind === "income"
            ? "↗"
            : kind === "expense"
              ? "↘"
              : kind === "description"
                ? "≡"
                : "◎"}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
      </div>
      <form className="addType" onSubmit={(e) => onAdd(e, kind)}>
        <input
          name="name"
          required
          maxLength={50}
          placeholder={
            kind === "description"
              ? "Nova descrição"
              : kind === "contact"
                ? "Novo fornecedor ou cliente"
                : "Nome do novo tipo"
          }
        />
        <button>＋ Adicionar</button>
      </form>
      <div className="typeRows">
        {items.length ? (
          items.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <button
                onClick={() => onRemove(kind, item.id)}
                aria-label={`Excluir ${item.name}`}
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <p>Nenhum tipo cadastrado.</p>
        )}
      </div>
    </section>
  );
}
function PanelHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panelHead">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`empty ${compact ? "compact" : ""}`}>
      <b>Nenhum lançamento por aqui.</b>
      <span>Adicione uma entrada ou saída para começar.</span>
    </div>
  );
}
function LedgerTable({
  entries,
  loading,
  onToggle,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  loading: boolean;
  onToggle: (e: Entry) => void;
  onEdit: (e: Entry) => void;
  onDelete: (e: Entry) => void;
}) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Descrição</th>
            <th>Fornecedor / cliente</th>
            <th>Data de geração</th>
            <th>Vencimento / pagamento</th>
            <th>Meio</th>
            <th>Previsto / realizado</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="empty">
                Carregando seu caixa…
              </td>
            </tr>
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <Empty />
              </td>
            </tr>
          ) : (
            entries.map((e) => {
              const status = entryStatus(e);
              return (
                <tr
                  key={e.id}
                  className={
                    e.paid
                      ? "paidRow"
                      : status === "Vencido"
                        ? "overdueRow"
                        : ""
                  }
                >
                  <td>
                    <label className="paymentCheck">
                      <input
                        type="checkbox"
                        checked={e.paid}
                        onChange={() => onToggle(e)}
                        aria-label={`${e.paid ? "Revisar" : "Confirmar"} ${e.type === "income" ? "recebimento" : "pagamento"} de ${e.description}`}
                      />
                      <span aria-hidden="true">{e.paid ? "✓" : ""}</span>
                      <em
                        className={`settlementStatus ${status.toLowerCase().replace(" ", "-")}`}
                      >
                        {status}
                      </em>
                    </label>
                  </td>
                  <td>
                    <b>{e.description}</b>
                    <small className="historyMeta">
                      {e.category}
                      {e.installments > 1
                        ? ` · Parcela ${e.installment}/${e.installments}`
                        : ""}
                    </small>
                  </td>
                  <td>
                    {e.contact || (
                      <span className="mutedDash">Não informado</span>
                    )}
                  </td>
                  <td>{labelDate(e.issueDate)}</td>
                  <td>
                    <b>{labelDate(e.dueDate)}</b>
                    {e.settlementDate && (
                      <small className="paymentDate">
                        {e.type === "income" ? "Recebido" : "Pago"} em{" "}
                        {labelDate(e.settlementDate)}
                      </small>
                    )}
                  </td>
                  <td>{e.paymentMethod}</td>
                  <td className={e.type}>
                    <b>
                      {e.type === "expense" ? "− " : "+ "}
                      {money.format(e.amountCents / 100)}
                    </b>
                    {e.paidAmountCents > 0 && (
                      <small className="realizedValue">
                        {e.type === "expense" ? "Pago" : "Recebido"}:{" "}
                        {money.format(e.paidAmountCents / 100)}
                        {e.type === "expense" &&
                        e.paidAmountCents > e.amountCents
                          ? ` · Juros: ${money.format((e.paidAmountCents - e.amountCents) / 100)}`
                          : ""}
                      </small>
                    )}
                  </td>
                  <td>
                    <div className="rowActions">
                      <button
                        onClick={() => onEdit(e)}
                        aria-label={`Editar ${e.description}`}
                      >
                        Editar
                      </button>
                      <button
                        className="delete"
                        onClick={() => onDelete(e)}
                        aria-label={`Excluir ${e.description}`}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
function SettlementModal({
  entry,
  onClose,
  onConfirm,
  onReverse,
}: {
  entry: Entry;
  onClose: () => void;
  onConfirm: (e: FormEvent<HTMLFormElement>) => void;
  onReverse: () => void;
}) {
  const remaining = Math.max(0, entry.amountCents - entry.paidAmountCents);
  const isIncome = entry.type === "income";
  const today = new Date().toISOString().slice(0, 10);
  const [paymentValue, setPaymentValue] = useState(
    (remaining / 100).toFixed(2).replace(".", ","),
  );
  const paymentCents = parseMoneyInput(paymentValue);
  const projectedPaid =
    entry.paidAmountCents + (Number.isFinite(paymentCents) ? paymentCents : 0);
  const interestCents = Math.max(0, projectedPaid - entry.amountCents);
  const pendingCents = Math.max(0, entry.amountCents - projectedPaid);

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="modal settlementModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-title"
      >
        <button className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">CONFIRMAÇÃO DE BAIXA</p>
        <h2 id="settlement-title">
          {isIncome ? "Confirmar recebimento" : "Confirmar pagamento"}
        </h2>
        <p className="modalIntro">
          Confira o valor, a data e o meio utilizado. Esses dados serão usados
          no saldo realizado.
        </p>
        <div className="settlementSummary">
          <article>
            <span>VALOR PREVISTO</span>
            <strong>{money.format(entry.amountCents / 100)}</strong>
          </article>
          <article>
            <span>JÁ REALIZADO</span>
            <strong>{money.format(entry.paidAmountCents / 100)}</strong>
          </article>
          <article className="remaining">
            <span>SALDO RESTANTE</span>
            <strong>{money.format(remaining / 100)}</strong>
          </article>
        </div>
        <div className="settlementContext">
          <span>{entry.description}</span>
          <small>
            {entry.installments > 1
              ? `Parcela ${entry.installment} de ${entry.installments}`
              : "Lançamento único"}
          </small>
        </div>
        {remaining > 0 ? (
          <form onSubmit={onConfirm}>
            <label className="field">
              <span>Quanto foi {isIncome ? "recebido" : "pago"} agora?</span>
              <input
                name="paymentAmount"
                required
                inputMode="decimal"
                value={paymentValue}
                onChange={(event) => setPaymentValue(event.target.value)}
                autoFocus
              />
            </label>
            <div
              className={`paymentCalculation ${interestCents > 0 ? "hasInterest" : pendingCents > 0 ? "hasPending" : "exact"}`}
            >
              <div>
                <span>Valor previsto</span>
                <b>{money.format(entry.amountCents / 100)}</b>
              </div>
              <div>
                <span>Valor total pago</span>
                <b>{money.format(projectedPaid / 100)}</b>
              </div>
              <div>
                <span>
                  {interestCents > 0
                    ? "Juros / acréscimos"
                    : pendingCents > 0
                      ? "Saldo pendente"
                      : "Diferença"}
                </span>
                <strong>
                  {money.format(
                    (interestCents > 0 ? interestCents : pendingCents) / 100,
                  )}
                </strong>
              </div>
            </div>
            <div className="formGrid">
              <label className="field">
                <span>Dia do {isIncome ? "recebimento" : "pagamento"}</span>
                <input
                  type="date"
                  name="settlementDate"
                  required
                  defaultValue={today}
                />
              </label>
              <label className="field">
                <span>Meio de {isIncome ? "recebimento" : "pagamento"}</span>
                <select
                  name="paymentMethod"
                  defaultValue={entry.paymentMethod || "Pix"}
                >
                  <option>Pix</option>
                  <option>Dinheiro</option>
                  <option>Cartão de crédito</option>
                  <option>Cartão de débito</option>
                  <option>Boleto</option>
                  <option>Transferência</option>
                  <option>Débito automático</option>
                  <option>Não informado</option>
                </select>
              </label>
            </div>
            <p className="settlementHint">
              Valores acima do previsto serão registrados como juros ou
              acréscimos. Valores menores deixam saldo pendente.
            </p>
            <button className="primary submit">
              Confirmar {isIncome ? "recebimento" : "pagamento"}
            </button>
          </form>
        ) : (
          <div className="settlementComplete">
            <strong>
              {isIncome ? "Recebimento confirmado" : "Pagamento confirmado"}
            </strong>
            <p>
              {money.format(entry.paidAmountCents / 100)} em{" "}
              {entry.settlementDate
                ? labelDate(entry.settlementDate)
                : "data não informada"}
              , via {entry.paymentMethod}.
            </p>
            {!isIncome && entry.paidAmountCents > entry.amountCents && (
              <p className="confirmedInterest">
                Juros e acréscimos:{" "}
                {money.format(
                  (entry.paidAmountCents - entry.amountCents) / 100,
                )}
              </p>
            )}
            <button className="reverseButton" onClick={onReverse}>
              Estornar valor realizado
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
function EntryModal({
  types,
  entry,
  onClose,
  onSubmit,
}: {
  types: ConfigLists;
  entry: Entry | null;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const [entryKind, setEntryKind] = useState<"income" | "expense">(
    entry?.type || "income",
  );
  const custom = (entryKind === "income" ? types.income : types.expense).map(
    (item) => item.name,
  );
  const options = custom.length
    ? custom
    : entryKind === "income"
      ? fallbackIncomeTypes
      : fallbackExpenseTypes;
  const descriptions = types.descriptions.map((item) => item.name);
  const contacts = types.contacts.map((item) => item.name);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="modal" role="dialog" aria-modal="true">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">
          {entry ? "EDITAR LANÇAMENTO" : "NOVO LANÇAMENTO"}
        </p>
        <h2>{entry ? "Atualize os dados" : "O que aconteceu no seu caixa?"}</h2>
        <p className="modalIntro">
          {entry
            ? "A edição afeta somente este lançamento ou parcela."
            : "Cadastre quando a movimentação foi gerada e quando deve ser paga ou recebida."}
        </p>
        <form onSubmit={onSubmit}>
          <div className="typeChoice">
            <label>
              <input
                type="radio"
                name="type"
                value="income"
                checked={entryKind === "income"}
                onChange={() => setEntryKind("income")}
              />
              <span>↗ Entrada / A receber</span>
            </label>
            <label>
              <input
                type="radio"
                name="type"
                value="expense"
                checked={entryKind === "expense"}
                onChange={() => setEntryKind("expense")}
              />
              <span>↘ Saída / A pagar</span>
            </label>
          </div>
          <label className="field">
            <span>Descrição</span>
            <select
              name="description"
              required
              defaultValue={entry?.description || ""}
            >
              <option value="" disabled>
                Selecione uma descrição
              </option>
              {entry?.description &&
                !descriptions.includes(entry.description) && (
                  <option>{entry.description}</option>
                )}
              {descriptions.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{entryKind === "expense" ? "Fornecedor" : "Cliente"}</span>
            <select name="contact" required defaultValue={entry?.contact || ""}>
              <option value="" disabled>
                Selecione uma opção
              </option>
              {entry?.contact && !contacts.includes(entry.contact) && (
                <option>{entry.contact}</option>
              )}
              {contacts.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <div
            className={`formGrid ${entryKind === "expense" ? "singleField" : ""}`}
          >
            <label className="field">
              <span>Valor previsto</span>
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={
                  entry
                    ? (entry.amountCents / 100).toFixed(2).replace(".", ",")
                    : undefined
                }
                placeholder="0,00"
              />
            </label>
            {entryKind === "income" ? (
              <label className="field">
                <span>Tipo de entrada</span>
                <select name="category" defaultValue={entry?.category}>
                  {entry?.category && !options.includes(entry.category) && (
                    <option>{entry.category}</option>
                  )}
                  {options.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            ) : (
              <input
                type="hidden"
                name="category"
                value={entry?.category || "Outros"}
              />
            )}
          </div>
          <div className="formGrid">
            <label className="field">
              <span>
                {entryKind === "expense"
                  ? "Data em que a despesa foi gerada"
                  : "Data em que a receita foi gerada"}
              </span>
              <input
                type="date"
                name="issueDate"
                required
                defaultValue={entry?.issueDate || today}
              />
            </label>
            <label className="field">
              <span>Data de vencimento</span>
              <input
                type="date"
                name="dueDate"
                required
                defaultValue={entry?.dueDate || `${isoMonth()}-15`}
              />
            </label>
          </div>
          <div className="formGrid">
            <label className="field">
              <span>
                Meio de {entryKind === "income" ? "recebimento" : "pagamento"}
              </span>
              <select
                name="paymentMethod"
                defaultValue={entry?.paymentMethod || "Pix"}
              >
                {entry?.paymentMethod &&
                  ![
                    "Pix",
                    "Dinheiro",
                    "Cartão de crédito",
                    "Cartão de débito",
                    "Boleto",
                    "Transferência",
                    "Débito automático",
                    "Não informado",
                  ].includes(entry.paymentMethod) && (
                    <option>{entry.paymentMethod}</option>
                  )}
                <option>Pix</option>
                <option>Dinheiro</option>
                <option>Cartão de crédito</option>
                <option>Cartão de débito</option>
                <option>Boleto</option>
                <option>Transferência</option>
                <option>Débito automático</option>
                <option>Não informado</option>
              </select>
            </label>
            <label className="field">
              <span>Número de parcelas</span>
              <input
                type="number"
                name="installments"
                min="1"
                max="60"
                defaultValue={entry?.installments || 1}
                disabled={Boolean(entry)}
                required
              />
            </label>
          </div>
          <button className="primary submit">
            {entry ? "Salvar alterações" : "Salvar lançamento"}
          </button>
        </form>
      </section>
    </div>
  );
}
