"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Entry = {
  id: number;
  groupId: string;
  description: string;
  category: string;
  type: "income" | "expense";
  amountCents: number;
  dueDate: string;
  installment: number;
  installments: number;
  paid: boolean;
};

const categories = ["Vendas", "Serviços", "Moradia", "Fornecedores", "Transporte", "Alimentação", "Saúde", "Lazer", "Outros"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function isoMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function moveMonth(month: string, offset: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + offset, 1);
  return isoMonth(date);
}

export function CashFlowApp() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [month, setMonth] = useState(isoMonth());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  async function loadEntries() {
    try {
      const response = await fetch("/api/entries");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEntries(data.entries);
    } catch {
      setError("Não foi possível carregar os lançamentos agora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadEntries(); }, []);

  const visible = useMemo(() => entries
    .filter((entry) => entry.dueDate.startsWith(month))
    .filter((entry) => filter === "all" || entry.type === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [entries, month, filter]);

  const totals = useMemo(() => entries.filter((entry) => entry.dueDate.startsWith(month)).reduce(
    (acc, entry) => {
      acc[entry.type] += entry.amountCents;
      if (!entry.paid) acc.pending += entry.type === "income" ? entry.amountCents : -entry.amountCents;
      return acc;
    }, { income: 0, expense: 0, pending: 0 }), [entries, month]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Confira os dados e tente novamente.");
    setEntries((current) => [...current, ...data.entries]);
    setMonth(String(form.get("dueDate")).slice(0, 7));
    setOpen(false);
  }

  async function togglePaid(entry: Entry) {
    const response = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paid: !entry.paid }),
    });
    if (response.ok) setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, paid: !item.paid } : item));
  }

  const monthDate = new Date(`${month}-02T12:00:00`);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Clara Fluxo — início"><span>c</span> clara fluxo</a>
        <div className="topActions"><button className="iconButton" aria-label="Notificações">●</button><div className="avatar">CA</div></div>
      </header>

      <section className="hero">
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Olá, Carla! <span>Seu caixa, sem complicação.</span></h1></div>
        <button className="primary" onClick={() => setOpen(true)}>＋ Novo lançamento</button>
      </section>

      <section className="monthNav" aria-label="Navegação por mês">
        <button onClick={() => setMonth(moveMonth(month, -1))} aria-label="Mês anterior">←</button>
        <strong>{monthName.format(monthDate)}</strong>
        <button onClick={() => setMonth(moveMonth(month, 1))} aria-label="Próximo mês">→</button>
      </section>

      <section className="cards">
        <article className="metric income"><div className="metricIcon">↗</div><div><p>Entradas</p><strong>{money.format(totals.income / 100)}</strong><small>previstas no mês</small></div></article>
        <article className="metric expense"><div className="metricIcon">↘</div><div><p>Saídas</p><strong>{money.format(totals.expense / 100)}</strong><small>previstas no mês</small></div></article>
        <article className="balance"><p>Saldo projetado</p><strong>{money.format((totals.income - totals.expense) / 100)}</strong><div className="balanceBar"><span style={{ width: `${Math.min(100, totals.income ? ((totals.income - totals.expense) / totals.income) * 100 : 0)}%` }} /></div><small>{money.format(Math.abs(totals.pending) / 100)} ainda aguardando confirmação</small></article>
      </section>

      <section className="ledger">
        <div className="ledgerHead"><div><p className="eyebrow">MOVIMENTAÇÕES</p><h2>Lançamentos do mês</h2></div><div className="filters">{(["all", "income", "expense"] as const).map((value) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{value === "all" ? "Todos" : value === "income" ? "Entradas" : "Saídas"}</button>)}</div></div>
        {error && <p className="notice">{error}</p>}
        <div className="tableWrap">
          <table><thead><tr><th>Status</th><th>Descrição</th><th>Categoria</th><th>Vencimento</th><th>Parcela</th><th>Valor</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="empty">Carregando seu caixa…</td></tr> : visible.length === 0 ? <tr><td colSpan={6} className="empty"><b>Nenhum lançamento por aqui.</b><span>Adicione uma entrada ou saída para começar.</span></td></tr> : visible.map((entry) => <tr key={entry.id}>
            <td><button className={`status ${entry.paid ? "done" : ""}`} onClick={() => togglePaid(entry)} aria-label={entry.paid ? "Marcar como pendente" : "Marcar como pago"}>{entry.paid ? "✓" : ""}</button></td>
            <td><b>{entry.description}</b></td><td><span className="tag">{entry.category}</span></td><td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${entry.dueDate}T12:00:00`))}</td><td>{entry.installments > 1 ? `${entry.installment}/${entry.installments}` : "—"}</td><td className={entry.type}>{entry.type === "expense" ? "− " : "+ "}{money.format(entry.amountCents / 100)}</td>
          </tr>)}</tbody></table>
        </div>
      </section>

      {open && <div className="modalBackdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <button className="close" onClick={() => setOpen(false)} aria-label="Fechar">×</button><p className="eyebrow">NOVO LANÇAMENTO</p><h2 id="dialog-title">O que aconteceu no seu caixa?</h2><p className="modalIntro">Se for parcelado, nós criamos todos os próximos vencimentos para você.</p>
        <form onSubmit={submit}>
          <div className="typeChoice"><label><input type="radio" name="type" value="income" defaultChecked /><span>↗ Entrada</span></label><label><input type="radio" name="type" value="expense" /><span>↘ Saída</span></label></div>
          <label className="field"><span>Descrição</span><input name="description" required placeholder="Ex.: Notebook para o escritório" /></label>
          <div className="formGrid"><label className="field"><span>Valor total</span><input name="amount" required inputMode="decimal" placeholder="0,00" /></label><label className="field"><span>Categoria</span><select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label></div>
          <div className="formGrid"><label className="field"><span>Primeiro vencimento</span><input type="date" name="dueDate" required defaultValue={`${isoMonth()}-15`} /></label><label className="field"><span>Número de parcelas</span><input type="number" name="installments" min="1" max="60" defaultValue="1" required /></label></div>
          <p className="splitHint">O valor total será dividido igualmente entre as parcelas, mês a mês.</p>
          <button className="primary submit" type="submit">Salvar lançamento</button>
        </form>
      </section></div>}
    </main>
  );
}
