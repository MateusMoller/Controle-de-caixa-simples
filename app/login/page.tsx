"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.authenticated) return router.replace("/dashboard");
      setReady(true);
    }).catch(error => setError(error instanceof Error ? error.message : "Não foi possível carregar o acesso."));
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Confira os dados e tente novamente.");
      setSubmitting(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return <main className="loginPage"><section className="loginCard">
    <div className="loginBrand"><span>c</span><b>clara fluxo</b></div>
    <p className="eyebrow">ACESSO SEGURO</p>
    <h1>Bem-vindo de volta</h1>
    <p className="loginIntro">Escolha seu usuário e informe a senha para acessar o controle de caixa.</p>
    {!ready && !error ? <p className="loginLoading">Verificando acesso…</p> : <form onSubmit={submit}>
      <label className="field"><span>Usuário</span><select name="username" autoComplete="username" required defaultValue=""><option value="" disabled>Selecione seu usuário</option><option value="alex">Alex</option><option value="carla">Carla</option><option value="duda">Duda</option><option value="igor">Igor</option></select></label>
      <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" required placeholder="Digite sua senha" /></label>
      {error && <p className="loginError">{error}</p>}
      <button className="primary loginSubmit" disabled={submitting}>{submitting ? "Aguarde…" : "Entrar"}</button>
    </form>}
    <small className="loginSecurity">A criação de novos usuários está desativada.</small>
  </section></main>;
}
